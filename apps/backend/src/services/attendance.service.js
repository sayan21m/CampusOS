import prisma from "../config/db.js";
import { formatDateOnly, parseDateOnly } from "../validators/calendar.validator.js";
import {
  ATTENDANCE_CORRECTION_DAYS,
  ATTENDANCE_THRESHOLD_PERCENT,
} from "../validators/attendance.validator.js";
import {
  notifyAttendanceShortage,
  safeNotify,
} from "./notification.service.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const ATTENDANCE_INCLUDE = {
  student: {
    select: {
      student_id: true,
      user_id: true,
      roll_number: true,
      full_name: true,
      dept_id: true,
      semester: true,
      section: true,
    },
  },
  subject: {
    select: {
      subject_id: true,
      subject_code: true,
      subject_name: true,
      dept_id: true,
      semester: true,
    },
  },
  faculty: {
    select: {
      faculty_id: true,
      employee_id: true,
      full_name: true,
    },
  },
};

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(start, end) {
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function assertWithinCorrectionWindow(classDate) {
  const today = utcToday();

  if (classDate > today) {
    throw createError("Cannot mark attendance for a future class date", 400);
  }

  if (daysBetween(classDate, today) > ATTENDANCE_CORRECTION_DAYS) {
    throw createError(
      `Attendance can only be marked or corrected within ${ATTENDANCE_CORRECTION_DAYS} days of the class date`,
      403
    );
  }
}

function parsePositiveId(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createError(`Invalid ${fieldName}`, 400);
  }
  return parsed;
}

function percentage(present, total) {
  if (!total) {
    return 0;
  }
  return Math.round((present / total) * 10000) / 100;
}

function classesNeededToRecover(present, total) {
  if (percentage(present, total) >= ATTENDANCE_THRESHOLD_PERCENT) {
    return 0;
  }
  return Math.max(0, Math.ceil(3 * total - 4 * present));
}

function serializeRecord(row) {
  return {
    attendance_id: row.attendance_id,
    student_id: row.student_id,
    subject_id: row.subject_id,
    faculty_id: row.faculty_id,
    timetable_id: row.timetable_id,
    class_date: formatDateOnly(row.class_date),
    status: row.status,
    marked_at: row.marked_at,
    updated_at: row.updated_at,
    student: row.student ?? null,
    subject: row.subject ?? null,
    faculty: row.faculty ?? null,
  };
}

function summarizeCounts(rows) {
  const present = rows.filter((row) => row.status === "PRESENT").length;
  const total = rows.length;
  const pct = percentage(present, total);

  return {
    present,
    absent: total - present,
    total,
    percentage: pct,
    below_threshold: total > 0 && pct < ATTENDANCE_THRESHOLD_PERCENT,
    classes_needed: classesNeededToRecover(present, total),
  };
}

async function getFacultyOrThrow(userId) {
  const faculty = await prisma.faculty.findUnique({
    where: { user_id: userId },
  });

  if (!faculty) {
    throw createError("Faculty profile not found", 404);
  }

  return faculty;
}

async function getStudentOrThrow(userId) {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
  });

  if (!student) {
    throw createError("Student profile not found", 404);
  }

  return student;
}

async function getSlotOrThrow(timetableId) {
  const slot = await prisma.timetableSlot.findUnique({
    where: { timetable_id: timetableId },
    include: {
      subject: {
        select: {
          subject_id: true,
          subject_code: true,
          subject_name: true,
          dept_id: true,
          semester: true,
          is_active: true,
        },
      },
    },
  });

  if (!slot) {
    throw createError("Timetable slot not found", 404);
  }

  return slot;
}

async function assertFacultyOwnsSlot(faculty, slot, classDate) {
  if (slot.faculty_id === faculty.faculty_id) {
    return;
  }

  const substitution = await prisma.timetableException.findUnique({
    where: {
      timetable_id_original_date: {
        timetable_id: slot.timetable_id,
        original_date: classDate,
      },
    },
    select: {
      exception_type: true,
      replacement_faculty_id: true,
    },
  });

  if (substitution?.exception_type === "CANCELLED") {
    throw createError("Cannot mark attendance for a cancelled class", 400);
  }

  if (substitution?.replacement_faculty_id === faculty.faculty_id) {
    return;
  }

  const allocated = await prisma.facultySubjectAllocation.findUnique({
    where: {
      faculty_id_subject_id: {
        faculty_id: faculty.faculty_id,
        subject_id: slot.subject_id,
      },
    },
    select: { allocation_id: true },
  });

  if (!allocated) {
    throw createError("You are not allotted to this class", 403);
  }
}

async function listSectionStudents(slot) {
  return prisma.student.findMany({
    where: {
      dept_id: slot.dept_id,
      semester: slot.semester,
      section: slot.section,
    },
    select: {
      student_id: true,
      user_id: true,
      roll_number: true,
      full_name: true,
      dept_id: true,
      semester: true,
      section: true,
    },
    orderBy: [{ roll_number: "asc" }],
  });
}

async function notifyIfShortage(studentId, subjectId) {
  const [student, subject, rows] = await Promise.all([
    prisma.student.findUnique({
      where: { student_id: studentId },
      select: { user_id: true },
    }),
    prisma.subject.findUnique({
      where: { subject_id: subjectId },
      select: {
        subject_id: true,
        subject_code: true,
        subject_name: true,
      },
    }),
    prisma.attendance.findMany({
      where: { student_id: studentId, subject_id: subjectId },
      select: { status: true },
    }),
  ]);

  if (!student || !subject) {
    return;
  }

  const summary = summarizeCounts(rows);
  if (!summary.below_threshold) {
    return;
  }

  await safeNotify(
    () =>
      notifyAttendanceShortage({
        user_id: student.user_id,
        subject,
        percentage: summary.percentage,
        classes_needed: summary.classes_needed,
      }),
    "attendance-shortage"
  );
}

export async function getClassRoster(userId, query) {
  const faculty = await getFacultyOrThrow(userId);
  const timetable_id = parsePositiveId(query.timetable_id, "timetable_id");
  const classDate = parseDateOnly(query.class_date);

  if (!classDate) {
    throw createError("Invalid class_date", 400);
  }

  const slot = await getSlotOrThrow(timetable_id);
  await assertFacultyOwnsSlot(faculty, slot, classDate);

  const students = await listSectionStudents(slot);
  const existing = await prisma.attendance.findMany({
    where: {
      timetable_id,
      class_date: classDate,
    },
    include: ATTENDANCE_INCLUDE,
  });

  const byStudent = new Map(existing.map((row) => [row.student_id, row]));

  return {
    timetable_id: slot.timetable_id,
    class_date: formatDateOnly(classDate),
    subject: slot.subject,
    dept_id: slot.dept_id,
    semester: slot.semester,
    section: slot.section,
    period: slot.period,
    room: slot.room,
    start_time: slot.start_time,
    end_time: slot.end_time,
    correction_days: ATTENDANCE_CORRECTION_DAYS,
    students: students.map((student) => {
      const mark = byStudent.get(student.student_id);
      return {
        ...student,
        attendance_id: mark?.attendance_id ?? null,
        status: mark?.status ?? null,
      };
    }),
  };
}

export async function markAttendance(userId, payload) {
  const faculty = await getFacultyOrThrow(userId);
  const classDate = parseDateOnly(payload.class_date);

  if (!classDate) {
    throw createError("Invalid class_date", 400);
  }

  assertWithinCorrectionWindow(classDate);

  const slot = await getSlotOrThrow(payload.timetable_id);
  await assertFacultyOwnsSlot(faculty, slot, classDate);

  const students = await listSectionStudents(slot);
  const allowedIds = new Set(students.map((row) => row.student_id));

  let records = payload.records || [];
  if (payload.mark_all_present) {
    const overrides = new Map(records.map((row) => [row.student_id, row.status]));
    records = students.map((student) => ({
      student_id: student.student_id,
      status: overrides.get(student.student_id) || "PRESENT",
    }));
  }

  for (const record of records) {
    if (!allowedIds.has(record.student_id)) {
      throw createError(
        `Student ${record.student_id} is not in this class section`,
        400
      );
    }
  }

  const saved = [];

  for (const record of records) {
    const row = await prisma.attendance.upsert({
      where: {
        student_id_timetable_id_class_date: {
          student_id: record.student_id,
          timetable_id: slot.timetable_id,
          class_date: classDate,
        },
      },
      create: {
        student_id: record.student_id,
        subject_id: slot.subject_id,
        faculty_id: faculty.faculty_id,
        timetable_id: slot.timetable_id,
        class_date: classDate,
        status: record.status,
      },
      update: {
        status: record.status,
        faculty_id: faculty.faculty_id,
      },
      include: ATTENDANCE_INCLUDE,
    });
    saved.push(row);
  }

  await Promise.all(
    [...new Set(records.map((row) => row.student_id))].map((studentId) =>
      notifyIfShortage(studentId, slot.subject_id)
    )
  );

  return saved.map(serializeRecord);
}

export async function updateAttendance(userId, attendanceId, payload) {
  const faculty = await getFacultyOrThrow(userId);
  const parsedId = parsePositiveId(attendanceId, "attendance id");

  const existing = await prisma.attendance.findUnique({
    where: { attendance_id: parsedId },
    include: ATTENDANCE_INCLUDE,
  });

  if (!existing) {
    throw createError("Attendance record not found", 404);
  }

  const slot = await getSlotOrThrow(existing.timetable_id);
  await assertFacultyOwnsSlot(faculty, slot, existing.class_date);
  assertWithinCorrectionWindow(existing.class_date);

  const updated = await prisma.attendance.update({
    where: { attendance_id: parsedId },
    data: { status: payload.status },
    include: ATTENDANCE_INCLUDE,
  });

  await notifyIfShortage(updated.student_id, updated.subject_id);
  return serializeRecord(updated);
}

export async function getMyAttendance(userId) {
  const student = await getStudentOrThrow(userId);
  const [rows, enrolledSubjects] = await Promise.all([
    prisma.attendance.findMany({
      where: { student_id: student.student_id },
      include: ATTENDANCE_INCLUDE,
      orderBy: [{ class_date: "desc" }, { attendance_id: "desc" }],
    }),
    prisma.subject.findMany({
      where: {
        dept_id: student.dept_id,
        semester: student.semester,
        is_active: true,
      },
      select: {
        subject_id: true,
        subject_code: true,
        subject_name: true,
      },
      orderBy: [{ subject_code: "asc" }],
    }),
  ]);

  const bySubject = new Map();
  for (const row of rows) {
    const current = bySubject.get(row.subject_id) || [];
    current.push(row);
    bySubject.set(row.subject_id, current);
  }

  const subjects = enrolledSubjects.map((subject) => {
    const subjectRows = bySubject.get(subject.subject_id) || [];
    return {
      subject_id: subject.subject_id,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      ...summarizeCounts(subjectRows),
      records: subjectRows.map(serializeRecord),
    };
  });

  for (const [subjectId, subjectRows] of bySubject.entries()) {
    if (subjects.some((item) => item.subject_id === subjectId)) {
      continue;
    }
    const first = subjectRows[0];
    subjects.push({
      subject_id: subjectId,
      subject_code: first.subject?.subject_code,
      subject_name: first.subject?.subject_name,
      ...summarizeCounts(subjectRows),
      records: subjectRows.map(serializeRecord),
    });
  }

  return {
    student_id: student.student_id,
    threshold_percent: ATTENDANCE_THRESHOLD_PERCENT,
    overall: summarizeCounts(rows),
    subjects,
    records: rows.map(serializeRecord),
  };
}

export async function getSubjectReport(userId, subjectId, query = {}) {
  const faculty = await getFacultyOrThrow(userId);
  const parsedSubjectId = parsePositiveId(subjectId, "subject id");

  const subject = await prisma.subject.findUnique({
    where: { subject_id: parsedSubjectId },
    select: {
      subject_id: true,
      subject_code: true,
      subject_name: true,
      dept_id: true,
      semester: true,
    },
  });

  if (!subject) {
    throw createError("Subject not found", 404);
  }

  const [slot, allocation] = await Promise.all([
    prisma.timetableSlot.findFirst({
      where: { subject_id: parsedSubjectId, faculty_id: faculty.faculty_id },
      select: { timetable_id: true },
    }),
    prisma.facultySubjectAllocation.findUnique({
      where: {
        faculty_id_subject_id: {
          faculty_id: faculty.faculty_id,
          subject_id: parsedSubjectId,
        },
      },
      select: { allocation_id: true },
    }),
  ]);

  if (!slot && !allocation) {
    throw createError("You are not allotted to this subject", 403);
  }

  const studentWhere = {
    dept_id: subject.dept_id,
    semester: subject.semester,
  };
  if (query.section) {
    studentWhere.section = query.section;
  }

  const [students, rows] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        student_id: true,
        roll_number: true,
        full_name: true,
        section: true,
      },
      orderBy: [{ section: "asc" }, { roll_number: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { subject_id: parsedSubjectId },
      select: {
        student_id: true,
        status: true,
        class_date: true,
      },
    }),
  ]);

  const rowsByStudent = new Map();
  for (const row of rows) {
    const current = rowsByStudent.get(row.student_id) || [];
    current.push(row);
    rowsByStudent.set(row.student_id, current);
  }

  const report = students.map((student) => ({
    ...student,
    ...summarizeCounts(rowsByStudent.get(student.student_id) || []),
  }));

  return {
    subject,
    threshold_percent: ATTENDANCE_THRESHOLD_PERCENT,
    count: report.length,
    students: report,
  };
}

export function formatSubjectReportCsv(report) {
  const header = [
    "roll_number",
    "full_name",
    "section",
    "present",
    "absent",
    "total",
    "percentage",
    "below_threshold",
    "classes_needed",
  ];

  const lines = [
    header.join(","),
    ...report.students.map((row) =>
      [
        row.roll_number,
        `"${String(row.full_name).replaceAll('"', '""')}"`,
        row.section,
        row.present,
        row.absent,
        row.total,
        row.percentage,
        row.below_threshold,
        row.classes_needed,
      ].join(",")
    ),
  ];

  return lines.join("\n");
}
