import prisma from "../config/db.js";
import {
  CALENDAR_ENTRY_TYPES,
  formatDateOnly,
  parseDateOnly,
} from "../validators/calendar.validator.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeEntry(entry) {
  return {
    calendar_id: entry.calendar_id,
    title: entry.title,
    description: entry.description,
    entry_type: entry.entry_type,
    start_date: formatDateOnly(entry.start_date),
    end_date: formatDateOnly(entry.end_date),
    academic_year: entry.academic_year,
    created_by: entry.created_by ?? null,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    source: entry.source || "calendar",
    reference_id: entry.reference_id ?? null,
  };
}

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createError(`Invalid ${fieldName}`, 400);
  }

  return parsed;
}

function parseOptionalAcademicYear(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
    throw createError("Invalid academic_year", 400);
  }

  return parsed;
}

function parseOptionalEntryType(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const entryType = String(value).trim().toUpperCase();
  if (!CALENDAR_ENTRY_TYPES.includes(entryType)) {
    throw createError("Invalid entry_type", 400);
  }

  return entryType;
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = parseDateOnly(String(value).trim());
  if (!date) {
    throw createError(`Invalid ${fieldName}`, 400);
  }

  return date;
}

function parseIncludeDeadlines(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  throw createError("Invalid include_deadlines", 400);
}

function academicYearForDate(date) {
  // Indian academic year typically starts in July.
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-based
  return month >= 6 ? year : year - 1;
}

async function loadAssignmentDeadlineEntries(userId, filters) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive || user.role !== "STUDENT") {
    return [];
  }

  if (
    filters.entry_type &&
    filters.entry_type !== "ASSIGNMENT_DEADLINE"
  ) {
    return [];
  }

  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { dept_id: true, semester: true, section: true },
  });

  if (!student) {
    return [];
  }

  const subjects = await prisma.subject.findMany({
    where: {
      dept_id: student.dept_id,
      semester: student.semester,
      is_active: true,
    },
    select: { subject_id: true },
  });

  const subjectIds = subjects.map((subject) => subject.subject_id);
  if (subjectIds.length === 0) {
    return [];
  }

  const deadlineWhere = {
    subject_id: { in: subjectIds },
    section: student.section,
  };

  if (filters.from || filters.to) {
    deadlineWhere.deadline = {};
    if (filters.from) {
      deadlineWhere.deadline.gte = filters.from;
    }
    if (filters.to) {
      const endOfDay = new Date(filters.to);
      endOfDay.setUTCHours(23, 59, 59, 999);
      deadlineWhere.deadline.lte = endOfDay;
    }
  }

  const assignments = await prisma.assignment.findMany({
    where: deadlineWhere,
    select: {
      assignment_id: true,
      title: true,
      description: true,
      deadline: true,
      subject: {
        select: {
          subject_code: true,
          subject_name: true,
        },
      },
    },
    orderBy: { deadline: "asc" },
  });

  return assignments
    .map((assignment) => {
      const deadlineDate = new Date(
        Date.UTC(
          assignment.deadline.getUTCFullYear(),
          assignment.deadline.getUTCMonth(),
          assignment.deadline.getUTCDate()
        )
      );
      const academicYear = academicYearForDate(deadlineDate);

      if (
        filters.academic_year !== undefined &&
        academicYear !== filters.academic_year
      ) {
        return null;
      }

      return serializeEntry({
        calendar_id: null,
        title: assignment.title,
        description:
          assignment.description ||
          `${assignment.subject.subject_code} — ${assignment.subject.subject_name}`,
        entry_type: "ASSIGNMENT_DEADLINE",
        start_date: deadlineDate,
        end_date: deadlineDate,
        academic_year: academicYear,
        created_by: null,
        created_at: assignment.deadline,
        updated_at: assignment.deadline,
        source: "assignment",
        reference_id: assignment.assignment_id,
      });
    })
    .filter(Boolean);
}

export async function listCalendarEntries(userId, query = {}) {
  const academic_year = parseOptionalAcademicYear(query.academic_year);
  const entry_type = parseOptionalEntryType(query.entry_type);
  const from = parseOptionalDate(query.from, "from");
  const to = parseOptionalDate(query.to, "to");
  const include_deadlines = parseIncludeDeadlines(query.include_deadlines);

  if (from && to && to < from) {
    throw createError("to must be on or after from", 400);
  }

  const where = {};

  if (academic_year !== undefined) {
    where.academic_year = academic_year;
  }

  if (entry_type) {
    where.entry_type = entry_type;
  }

  if (from || to) {
    where.AND = [];
    if (from) {
      where.AND.push({ end_date: { gte: from } });
    }
    if (to) {
      where.AND.push({ start_date: { lte: to } });
    }
  }

  const entries = await prisma.academicCalendar.findMany({
    where,
    orderBy: [{ start_date: "asc" }, { calendar_id: "asc" }],
  });

  const serialized = entries.map(serializeEntry);

  if (include_deadlines) {
    const deadlineEntries = await loadAssignmentDeadlineEntries(userId, {
      academic_year,
      entry_type,
      from,
      to,
    });
    serialized.push(...deadlineEntries);
  }

  serialized.sort((a, b) => {
    if (a.start_date === b.start_date) {
      return (a.calendar_id || 0) - (b.calendar_id || 0);
    }
    return a.start_date < b.start_date ? -1 : 1;
  });

  return serialized;
}

export async function getCalendarEntryById(calendarId) {
  const calendar_id = parseOptionalPositiveInt(calendarId, "calendar id");

  if (calendar_id === undefined) {
    throw createError("Invalid calendar id", 400);
  }

  const entry = await prisma.academicCalendar.findUnique({
    where: { calendar_id },
  });

  if (!entry) {
    throw createError("Calendar entry not found", 404);
  }

  return serializeEntry(entry);
}

export async function createCalendarEntry(data, userId) {
  const start_date = parseDateOnly(data.start_date);
  const end_date = parseDateOnly(data.end_date);

  if (!start_date || !end_date) {
    throw createError("Invalid start_date or end_date", 400);
  }

  if (end_date < start_date) {
    throw createError("end_date must be on or after start_date", 400);
  }

  const entry = await prisma.academicCalendar.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      entry_type: data.entry_type,
      start_date,
      end_date,
      academic_year: data.academic_year,
      created_by: userId,
    },
  });

  return serializeEntry(entry);
}

export async function updateCalendarEntry(calendarId, data) {
  const calendar_id = parseOptionalPositiveInt(calendarId, "calendar id");

  if (calendar_id === undefined) {
    throw createError("Invalid calendar id", 400);
  }

  const existing = await prisma.academicCalendar.findUnique({
    where: { calendar_id },
  });

  if (!existing) {
    throw createError("Calendar entry not found", 404);
  }

  const nextStart =
    data.start_date !== undefined
      ? parseDateOnly(data.start_date)
      : existing.start_date;
  const nextEnd =
    data.end_date !== undefined ? parseDateOnly(data.end_date) : existing.end_date;

  if (!nextStart || !nextEnd) {
    throw createError("Invalid start_date or end_date", 400);
  }

  if (nextEnd < nextStart) {
    throw createError("end_date must be on or after start_date", 400);
  }

  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.entry_type !== undefined) updateData.entry_type = data.entry_type;
  if (data.start_date !== undefined) updateData.start_date = nextStart;
  if (data.end_date !== undefined) updateData.end_date = nextEnd;
  if (data.academic_year !== undefined) {
    updateData.academic_year = data.academic_year;
  }

  const updated = await prisma.academicCalendar.update({
    where: { calendar_id },
    data: updateData,
  });

  return serializeEntry(updated);
}

export async function deleteCalendarEntry(calendarId) {
  const calendar_id = parseOptionalPositiveInt(calendarId, "calendar id");

  if (calendar_id === undefined) {
    throw createError("Invalid calendar id", 400);
  }

  const existing = await prisma.academicCalendar.findUnique({
    where: { calendar_id },
  });

  if (!existing) {
    throw createError("Calendar entry not found", 404);
  }

  await prisma.academicCalendar.delete({
    where: { calendar_id },
  });

  return {
    calendar_id,
    message: "Calendar entry deleted successfully",
  };
}
