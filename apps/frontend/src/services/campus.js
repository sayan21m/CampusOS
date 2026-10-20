import api from "./api";

function formatTimeRange(start, end) {
  if (!start && !end) {
    return "Time TBA";
  }

  return `${start || "--:--"} - ${end || "--:--"}`;
}

function classStatus(startTime, endTime) {
  if (!startTime || !endTime) {
    return "Scheduled";
  }

  const now = new Date();
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    [startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))
  ) {
    return "Scheduled";
  }

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  if (now < start) {
    return "Upcoming";
  }

  if (now > end) {
    return "Completed";
  }

  return "Ongoing";
}

export function mapTimetableOccurrence(occurrence) {
  return {
    id: occurrence.timetable_id,
    time: formatTimeRange(occurrence.start_time, occurrence.end_time),
    subject: occurrence.subject?.subject_name || "Subject",
    code: occurrence.subject?.subject_code || `SUB-${occurrence.subject_id}`,
    room: occurrence.room || "TBA",
    status:
      occurrence.exception_type === "CANCELLED"
        ? "Cancelled"
        : classStatus(occurrence.start_time, occurrence.end_time),
    period: occurrence.period,
    faculty: occurrence.faculty?.full_name || null,
  };
}

export function mapNotice(notice) {
  const createdAt = notice.created_at ? new Date(notice.created_at) : null;

  return {
    id: notice.notice_id,
    title: notice.title,
    date: createdAt
      ? createdAt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    tag: notice.category
      ? String(notice.category).charAt(0).toUpperCase() +
        String(notice.category).slice(1)
      : "Notice",
    urgent: String(notice.priority || "").toLowerCase() === "urgent",
    content: notice.content || "",
    priority: notice.priority || "normal",
  };
}

export async function fetchTodayTimetable() {
  const { data } = await api.get("/timetable/today");
  const rows = Array.isArray(data.timetable) ? data.timetable : [];
  return rows.map(mapTimetableOccurrence);
}

export async function fetchNotices() {
  const { data } = await api.get("/notices");
  const rows = Array.isArray(data.notice) ? data.notice : [];
  return rows.map(mapNotice);
}

export async function fetchMyAssignments() {
  const { data } = await api.get("/submissions/my");
  const rows = Array.isArray(data.assignments)
    ? data.assignments
    : Array.isArray(data)
      ? data
      : [];

  return rows.map((item) => {
    const status = item.status === "Checked" ? "Submitted" : item.status;
    const marks = item.submission?.marks;
    const maxMarks = item.max_marks;

    return {
      id: String(item.assignment_id),
      title: item.title,
      subject: item.subject_name || "Subject",
      code: item.subject_code || `SUB-${item.subject_id}`,
      dueDate: item.deadline,
      status,
      grade:
        status === "Graded" && marks != null
          ? `${marks}/${maxMarks ?? ""}`.replace(/\/$/, "")
          : undefined,
      feedback: item.submission?.feedback || undefined,
      submittedFile:
        item.submission != null ? `Submission #${item.submission.submission_id}` : undefined,
      maxMarks: item.max_marks,
    };
  });
}

export async function submitAssignmentFile(assignmentId, file) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post(`/submissions/assignments/${assignmentId}`, form);
  return data;
}

export async function fetchFacultyAssignments() {
  const { data } = await api.get("/assignments/my");
  return Array.isArray(data.assignments)
    ? data.assignments
    : Array.isArray(data)
      ? data
      : [];
}
