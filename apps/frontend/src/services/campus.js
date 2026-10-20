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

export async function fetchSubjects() {
  const { data } = await api.get("/subjects");
  return Array.isArray(data.subjects) ? data.subjects : [];
}

export async function fetchNotes(params = {}) {
  const { data } = await api.get("/notes", { params });
  const rows = Array.isArray(data.notes) ? data.notes : [];

  return rows.map((note) => ({
    id: note.notes_id,
    subjectId: note.subject_id,
    subjectName: note.subject?.subject_name || "Subject",
    subjectCode: note.subject?.subject_code || `SUB-${note.subject_id}`,
    title: note.title,
    description: note.description || "",
    unitNumber: note.unit_number,
    materialType: note.material_type,
    academicYear: note.academic_year,
    fileSizeBytes: note.file_size_bytes,
    createdAt: note.created_at,
    uploadedBy: note.uploaded_by,
  }));
}

export async function uploadNote(payload) {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("subject_id", String(payload.subjectId));
  form.append("title", payload.title);
  if (payload.description) {
    form.append("description", payload.description);
  }
  form.append("unit_number", String(payload.unitNumber));
  form.append("material_type", payload.materialType);
  form.append("academic_year", String(payload.academicYear));

  const { data } = await api.post("/notes", form);
  return data;
}

export async function deleteNote(notesId) {
  const { data } = await api.delete(`/notes/${notesId}`);
  return data;
}

export async function downloadNoteFile(notesId, title = "material") {
  const response = await api.get(`/notes/${notesId}/download`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `${title}.bin`;
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function previewNoteFile(notesId) {
  const response = await api.get(`/notes/${notesId}/preview`, {
    responseType: "blob",
  });
  return window.URL.createObjectURL(response.data);
}

export async function fetchEffectiveTimetable(date) {
  const { data } = await api.get("/timetable/effective", {
    params: { date },
  });
  const rows = Array.isArray(data.timetable) ? data.timetable : [];
  return rows.map(mapTimetableOccurrence);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchDepartments() {
  const { data } = await api.get("/departments");
  return Array.isArray(data.departments) ? data.departments : [];
}

export async function createDepartment({ dept_name, dept_code }) {
  const { data } = await api.post("/departments", { dept_name, dept_code });
  return data.department;
}

export async function updateDepartment(deptId, patch) {
  const { data } = await api.patch(`/departments/${deptId}`, patch);
  return data.department;
}

export async function createSubject(payload) {
  const { data } = await api.post("/subjects", payload);
  return data.subject;
}

export async function createNotice(payload) {
  const { data } = await api.post("/notices", payload);
  return data.notice ?? data;
}

export async function createStudentProfile(payload) {
  const { data } = await api.post("/students", payload);
  return data.student ?? data;
}

export async function createFacultyProfile(payload) {
  const { data } = await api.post("/faculty", payload);
  return data.faculty ?? data;
}

export async function fetchStudentById(studentId) {
  const { data } = await api.get(`/students/${studentId}`);
  return data.student ?? data;
}

export async function fetchTimetableSlots({ dept_id, semester, section }) {
  const { data } = await api.get("/timetable", {
    params: { dept_id, semester, section },
  });
  return Array.isArray(data.timetable) ? data.timetable : [];
}

export async function createTimetableSlot(payload) {
  const { data } = await api.post("/timetable", payload);
  return data.timetable ?? data;
}

export async function deleteTimetableSlot(timetableId) {
  const { data } = await api.delete(`/timetable/${timetableId}`);
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.patch("/auth/password", {
    currentPassword,
    newPassword,
  });
  return data;
}

export async function fetchWeekTimetable(anchorDate = new Date()) {
  const start = new Date(anchorDate);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(12, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  const results = await Promise.all(
    days.map(async (date) => {
      const key = toDateKey(date);
      try {
        const classes = await fetchEffectiveTimetable(key);
        return { date: key, label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), classes };
      } catch {
        return { date: key, label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), classes: [] };
      }
    })
  );

  return results;
}
