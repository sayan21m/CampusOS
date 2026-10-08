export type AssignmentStatus = "Pending" | "Submitted" | "Late" | "Checked" | "Graded";

export interface StudentSubmission {
  submission_id: number;
  submitted_at: string;
  is_late: boolean;
  marks: number | null;
  feedback: string | null;
  status: string;
}

export interface StudentAssignment {
  assignment_id: number;
  title: string;
  subject_id: number;
  section: string;
  deadline: string;
  max_marks: number;
  status: AssignmentStatus;
  submission: StudentSubmission | null;
}

export interface StudentProfileSummary {
  fullName: string;
  rollNumber: string;
  department: string;
  semester: number | string | null;
  section: string;
  photoUrl: string | null;
}

export type DeadlineTone = "normal" | "approaching" | "overdue";

export type BadgeTone = "neutral" | "info" | "warn" | "danger" | "ok";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function toTime(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function getAcademicYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 6 ? year : year - 1;

  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "S";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatDateTime(value: string): string {
  const time = toTime(value);

  if (Number.isNaN(time)) {
    return "Date unavailable";
  }

  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value: string): string {
  const time = toTime(value);

  if (Number.isNaN(time)) {
    return "";
  }

  return new Date(time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatShortDate(value: string): string {
  const time = toTime(value);

  if (Number.isNaN(time)) {
    return "—";
  }

  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getDeadlineTone(deadline: string, now: number = Date.now()): DeadlineTone {
  const time = toTime(deadline);

  if (Number.isNaN(time)) {
    return "normal";
  }

  if (time < now) {
    return "overdue";
  }

  if (time - now <= 2 * DAY) {
    return "approaching";
  }

  return "normal";
}

export function describeDeadline(deadline: string, now: number = Date.now()): string {
  const time = toTime(deadline);

  if (Number.isNaN(time)) {
    return "Deadline unavailable";
  }

  const dayDiff = Math.round((startOfDay(time) - startOfDay(now)) / DAY);

  if (time < now) {
    const overdueDays = Math.max(0, -dayDiff);
    if (overdueDays === 0) {
      return "Overdue today";
    }
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
  }

  if (dayDiff === 0) {
    return "Due today";
  }

  if (dayDiff === 1) {
    return "Due tomorrow";
  }

  return `Due in ${dayDiff} days`;
}

export function describeRelativePast(value: string, now: number = Date.now()): string {
  const time = toTime(value);

  if (Number.isNaN(time)) {
    return "";
  }

  const diff = now - time;

  if (diff < HOUR) {
    const minutes = Math.max(1, Math.round(diff / (60 * 1000)));
    return `${minutes} min ago`;
  }

  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(diff / DAY);

  if (days <= 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatShortDate(value);
}

export function hasReleasedMarks(assignment: StudentAssignment): boolean {
  return (
    assignment.status === "Graded" &&
    assignment.submission !== null &&
    typeof assignment.submission.marks === "number"
  );
}

export function getScorePercent(assignment: StudentAssignment): number | null {
  if (!hasReleasedMarks(assignment) || !assignment.max_marks) {
    return null;
  }

  const marks = assignment.submission?.marks ?? 0;
  return Math.round((marks / assignment.max_marks) * 1000) / 10;
}

export function getStatusBadge(
  assignment: StudentAssignment,
  now: number = Date.now()
): { label: string; tone: BadgeTone } {
  switch (assignment.status) {
    case "Pending":
      return getDeadlineTone(assignment.deadline, now) === "overdue"
        ? { label: "Overdue", tone: "danger" }
        : { label: "Pending", tone: "neutral" };
    case "Submitted":
      return { label: "Submitted", tone: "info" };
    case "Late":
      return { label: "Submitted late", tone: "warn" };
    case "Checked":
      return { label: "Under review", tone: "neutral" };
    case "Graded":
      return { label: "Graded", tone: "ok" };
    default:
      return { label: assignment.status, tone: "neutral" };
  }
}

export function getSubjectLabel(assignment: StudentAssignment): string {
  return `Subject #${assignment.subject_id}`;
}

export function sortByDeadline(assignments: StudentAssignment[]): StudentAssignment[] {
  return [...assignments].sort((a, b) => toTime(a.deadline) - toTime(b.deadline));
}
