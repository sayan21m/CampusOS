import prisma from "../config/db.js";
import { validateMergedSlotTimes } from "../validators/timetable.validator.js";
import {
  TIMETABLE_SLOT_READ_INCLUDE,
  filterOccurrences,
  getKolkataDateOnly,
  getKolkataDayOfWeek as kolkataDayOfWeek,
  loadOccurrencesForDate,
  occurrenceConflictKind,
} from "./timetable-effective.js";

export { getKolkataDateOnly, getKolkataDayOfWeek } from "./timetable-effective.js";

const USER_AUTH_SELECT = Object.freeze({
  user_id: true,
  role: true,
});

const FACULTY_AUTH_SELECT = Object.freeze({
  faculty_id: true,
  user_id: true,
  dept_id: true,
});

const STUDENT_AUTH_SELECT = Object.freeze({
  student_id: true,
  user_id: true,
  dept_id: true,
  semester: true,
  section: true,
});

const TIMETABLE_EXCEPTION_READ_INCLUDE = Object.freeze({
  timetable: {
    include: TIMETABLE_SLOT_READ_INCLUDE,
  },
  replacement_faculty: {
    select: {
      faculty_id: true,
      full_name: true,
    },
  },
});

const EDITABLE_SLOT_FIELDS = Object.freeze([
  "subject_id",
  "faculty_id",
  "dept_id",
  "semester",
  "section",
  "day_of_week",
  "period",
  "room",
  "start_time",
  "end_time",
]);

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeSection(section) {
  if (typeof section !== "string") {
    throw createError("Section must be a string", 400);
  }

  const normalized = section.trim().toUpperCase();

  if (!normalized) {
    throw createError("Section cannot be empty", 400);
  }

  return normalized;
}

function mergeTimetableSlot(existing, patch = {}) {
  const merged = {};

  for (const field of EDITABLE_SLOT_FIELDS) {
    merged[field] = patch[field] !== undefined ? patch[field] : existing[field];
  }

  merged.section = normalizeSection(merged.section);
  return merged;
}

function mapUniqueConstraintError(error) {
  if (error?.code !== "P2002") {
    return null;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target
    : typeof target === "string"
      ? target.split("_").filter(Boolean)
      : [];

  const has = (...required) => required.every((field) => fields.includes(field));

  if (has("dept_id", "semester", "section", "day_of_week", "period")) {
    return createError("A timetable slot already exists for this group and period", 409);
  }

  if (has("faculty_id", "day_of_week", "period")) {
    return createError("Faculty member already has a class during the requested period", 409);
  }

  if (has("room", "day_of_week", "period")) {
    return createError("Room is already booked during the requested period", 409);
  }

  if (has("timetable_id", "original_date")) {
    return createError("An exception already exists for this slot on the given date", 409);
  }

  return createError("A conflicting timetable slot already exists", 409);
}

async function requireAdmin(user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "ADMIN") {
    throw createError("Access denied", 403);
  }

  return user;
}

function requireOriginalDate(original_date) {
  if (!(original_date instanceof Date) || Number.isNaN(original_date.getTime())) {
    throw createError("original_date is required", 400);
  }

  return original_date;
}

function assertDateMatchesSlotWeekday(slot, date, field = "original_date") {
  const dayOfWeek = kolkataDayOfWeek(date);

  if (!dayOfWeek) {
    throw createError("Unable to determine weekday for timetable", 500);
  }

  if (dayOfWeek !== slot.day_of_week) {
    throw createError(`${field} must fall on the slot's scheduled weekday`, 400);
  }
}

function conflictError(kind) {
  if (kind === "room") {
    return createError("Room is already booked during the requested time", 409);
  }

  if (kind === "faculty") {
    return createError("Faculty member already has a class during the requested time", 409);
  }

  if (kind === "section") {
    return createError("This period is already assigned to the selected group", 409);
  }

  return createError("A conflicting timetable slot already exists", 409);
}

async function assertOccurrenceAvailable(tx, proposed, { excludeTimetableId } = {}) {
  const existing = await loadOccurrencesForDate(tx, proposed.date);

  for (const occurrence of existing) {
    if (excludeTimetableId !== undefined && occurrence.timetable_id === excludeTimetableId) {
      continue;
    }

    const kind = occurrenceConflictKind(proposed, occurrence);
    if (kind) {
      throw conflictError(kind);
    }
  }
}

async function createExceptionRecord(tx, data) {
  try {
    return await tx.timetableException.create({ data });
  } catch (error) {
    const uniqueError = mapUniqueConstraintError(error);
    if (uniqueError) {
      throw uniqueError;
    }

    throw error;
  }
}

async function assertReplacementFaculty(tx, replacement_faculty_id, slot) {
  const replacement = await tx.faculty.findUnique({
    where: {
      faculty_id: replacement_faculty_id,
    },
  });

  if (!replacement) {
    throw createError("Replacement faculty not found", 404);
  }

  if (replacement.dept_id !== slot.dept_id) {
    throw createError("Replacement faculty does not belong to the selected department", 400);
  }

  if (replacement.faculty_id === slot.faculty_id) {
    throw createError("Replacement faculty must be different from the assigned faculty", 400);
  }

  return replacement;
}

async function authorizeSlotView(user, slot) {
  if (user.role === "ADMIN") {
    return;
  }

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id: user.user_id,
      },
      select: FACULTY_AUTH_SELECT,
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    if (faculty.dept_id !== slot.dept_id) {
      throw createError("Access denied", 403);
    }

    return;
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id: user.user_id,
      },
      select: STUDENT_AUTH_SELECT,
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (
      student.dept_id !== slot.dept_id ||
      student.semester !== slot.semester ||
      student.section.trim().toUpperCase() !== String(slot.section).trim().toUpperCase()
    ) {
      throw createError("Access denied", 403);
    }

    return;
  }

  throw createError("Access denied", 403);
}

function isSerializationConflict(error) {
  if (!error) {
    return false;
  }

  if (error.code === "P2034") {
    return true;
  }

  const message = String(error.message || "");
  if (/transaction\s*write\s*conflict/i.test(message)) {
    return true;
  }

  const cause = error.cause;
  if (cause && cause !== error) {
    return isSerializationConflict(cause);
  }

  return false;
}

async function withSerializableTransaction(work, { retries = 3 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      lastError = error;

      if (isSerializationConflict(error) && attempt < retries - 1) {
        continue;
      }

      const uniqueError = mapUniqueConstraintError(error);
      if (uniqueError) {
        throw uniqueError;
      }

      if (isSerializationConflict(error)) {
        throw createError("A conflicting timetable change is already in progress", 409);
      }

      throw error;
    }
  }

  if (isSerializationConflict(lastError)) {
    throw createError("A conflicting timetable change is already in progress", 409);
  }

  throw lastError;
}

export async function createTimetableSlot(timeTableData, user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "ADMIN") {
    throw createError("Access denied", 403);
  }

  const {
    subject_id,
    faculty_id,
    dept_id,
    semester,
    day_of_week,
    period,
    room,
    start_time,
    end_time,
  } = timeTableData;

  const section = normalizeSection(timeTableData.section);

  const [subject, faculty, dept] = await Promise.all([
    prisma.subject.findUnique({ where: { subject_id } }),
    prisma.faculty.findUnique({ where: { faculty_id } }),
    prisma.department.findUnique({ where: { dept_id } }),
  ]);

  if (!subject) {
    throw createError("Subject not found", 404);
  }

  if (subject.dept_id !== dept_id || subject.semester !== semester) {
    throw createError("Subject does not belong to the selected department and semester", 400);
  }

  if (!faculty) {
    throw createError("Faculty not found", 404);
  }

  if (faculty.dept_id !== dept_id) {
    throw createError("Faculty does not belong to the selected department", 400);
  }

  if (!dept) {
    throw createError("Department not found", 404);
  }

  return withSerializableTransaction(async (tx) => {
    const existingGroupSlot = await tx.timetableSlot.findFirst({
      where: {
        dept_id,
        semester,
        section,
        day_of_week,
        period,
      },
    });

    if (existingGroupSlot) {
      throw createError("This period is already assigned to the selected group", 409);
    }

    const overlap = {
      start_time: { lt: end_time },
      end_time: { gt: start_time },
    };

    const roomConflict = await tx.timetableSlot.findFirst({
      where: {
        day_of_week,
        room,
        ...overlap,
      },
    });

    if (roomConflict) {
      throw createError("Room is already booked during the requested time", 409);
    }

    const facultyConflict = await tx.timetableSlot.findFirst({
      where: {
        day_of_week,
        faculty_id,
        ...overlap,
      },
    });

    if (facultyConflict) {
      throw createError("Faculty member already has a class during the requested time", 409);
    }

    try {
      return await tx.timetableSlot.create({
        data: {
          subject_id,
          faculty_id,
          dept_id,
          semester,
          section,
          day_of_week,
          period,
          room,
          start_time,
          end_time,
        },
      });
    } catch (error) {
      const uniqueError = mapUniqueConstraintError(error);
      if (uniqueError) {
        throw uniqueError;
      }

      throw error;
    }
  });
}

export async function updateTimetableSlot(timetable_id, timeTableData, user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "ADMIN") {
    throw createError("Access denied", 403);
  }

  return withSerializableTransaction(async (tx) => {
    const slot = await tx.timetableSlot.findUnique({
      where: {
        timetable_id,
      },
    });

    if (!slot) {
      throw createError("Slot not found", 404);
    }

    const merged = mergeTimetableSlot(slot, timeTableData);

    const timeCheck = validateMergedSlotTimes(slot, timeTableData);
    if (!timeCheck.success) {
      throw createError(timeCheck.message, 400);
    }

    merged.start_time = timeCheck.merged.start_time;
    merged.end_time = timeCheck.merged.end_time;

    const {
      subject_id,
      faculty_id,
      dept_id,
      semester,
      section,
      day_of_week,
      period,
      room,
      start_time,
      end_time,
    } = merged;

    const [subject, faculty, dept] = await Promise.all([
      tx.subject.findUnique({ where: { subject_id } }),
      tx.faculty.findUnique({ where: { faculty_id } }),
      tx.department.findUnique({ where: { dept_id } }),
    ]);

    if (!subject) {
      throw createError("Subject not found", 404);
    }

    if (subject.dept_id !== dept_id || subject.semester !== semester) {
      throw createError("Subject does not belong to the selected department and semester", 400);
    }

    if (!faculty) {
      throw createError("Faculty not found", 404);
    }

    if (faculty.dept_id !== dept_id) {
      throw createError("Faculty does not belong to the selected department", 400);
    }

    if (!dept) {
      throw createError("Department not found", 404);
    }

    const existingGroupSlot = await tx.timetableSlot.findFirst({
      where: {
        dept_id,
        semester,
        section,
        day_of_week,
        period,
        NOT: {
          timetable_id,
        },
      },
    });

    if (existingGroupSlot) {
      throw createError("This period is already assigned to the selected group", 409);
    }

    const overlap = {
      start_time: { lt: end_time },
      end_time: { gt: start_time },
    };

    const roomConflict = await tx.timetableSlot.findFirst({
      where: {
        day_of_week,
        room,
        ...overlap,
        NOT: {
          timetable_id,
        },
      },
    });

    if (roomConflict) {
      throw createError("Room is already booked during the requested time", 409);
    }

    const facultyConflict = await tx.timetableSlot.findFirst({
      where: {
        day_of_week,
        faculty_id,
        ...overlap,
        NOT: {
          timetable_id,
        },
      },
    });

    if (facultyConflict) {
      throw createError("Faculty member already has a class during the requested time", 409);
    }

    try {
      return await tx.timetableSlot.update({
        where: {
          timetable_id,
        },
        data: {
          subject_id,
          faculty_id,
          dept_id,
          semester,
          section,
          day_of_week,
          period,
          room,
          start_time,
          end_time,
        },
      });
    } catch (error) {
      const uniqueError = mapUniqueConstraintError(error);
      if (uniqueError) {
        throw uniqueError;
      }

      throw error;
    }
  });
}

export async function deleteTimetableSlot(timetable_id, user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "ADMIN") {
    throw createError("Access denied", 403);
  }

  const existingSlot = await prisma.timetableSlot.findUnique({
    where: {
      timetable_id,
    },
  });

  if (!existingSlot) {
    throw createError("Slot not found", 404);
  }

  try {
    return await prisma.timetableSlot.delete({
      where: {
        timetable_id,
      },
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw createError("Slot not found", 404);
    }

    throw error;
  }
}

export async function getTimetable(dept_id, semester, section, user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (
    !Number.isInteger(dept_id) ||
    dept_id <= 0 ||
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > 8 ||
    typeof section !== "string" ||
    !section.trim()
  ) {
    throw createError("Invalid timetable parameters", 400);
  }

  const normalizedSection = section.trim().toUpperCase();

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
      select: FACULTY_AUTH_SELECT,
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    if (faculty.dept_id !== dept_id) {
      throw createError("Access denied", 403);
    }
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id,
      },
      select: STUDENT_AUTH_SELECT,
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (
      student.dept_id !== dept_id ||
      student.semester !== semester ||
      student.section.trim().toUpperCase() !== normalizedSection
    ) {
      throw createError("Access denied", 403);
    }
  } else if (user.role !== "ADMIN") {
    throw createError("Access denied", 403);
  }

  return prisma.timetableSlot.findMany({
    where: {
      dept_id,
      semester,
      section: normalizedSection,
    },
    include: TIMETABLE_SLOT_READ_INCLUDE,
    orderBy: [{ day_of_week: "asc" }, { period: "asc" }],
  });
}

export async function getEffectiveTimetable(user_id, { date, dept_id, semester, section } = {}) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw createError("date is required", 400);
  }

  if (!["ADMIN", "FACULTY", "STUDENT"].includes(user.role)) {
    throw createError("Access denied", 403);
  }

  const occurrences = await loadOccurrencesForDate(prisma, date);

  if (user.role === "ADMIN") {
    if (dept_id !== undefined || semester !== undefined || section !== undefined) {
      if (
        !Number.isInteger(dept_id) ||
        dept_id <= 0 ||
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 8 ||
        typeof section !== "string" ||
        !section.trim()
      ) {
        throw createError("Invalid timetable parameters", 400);
      }

      return filterOccurrences(occurrences, {
        dept_id,
        semester,
        section: section.trim().toUpperCase(),
      });
    }

    return occurrences;
  }

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
      select: FACULTY_AUTH_SELECT,
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    if (dept_id !== undefined || semester !== undefined || section !== undefined) {
      if (faculty.dept_id !== dept_id) {
        throw createError("Access denied", 403);
      }

      if (
        !Number.isInteger(dept_id) ||
        dept_id <= 0 ||
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 8 ||
        typeof section !== "string" ||
        !section.trim()
      ) {
        throw createError("Invalid timetable parameters", 400);
      }

      return filterOccurrences(occurrences, {
        dept_id,
        semester,
        section: section.trim().toUpperCase(),
      });
    }

    return filterOccurrences(occurrences, { faculty_id: faculty.faculty_id });
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id,
      },
      select: STUDENT_AUTH_SELECT,
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    const ownSection = student.section.trim().toUpperCase();

    if (dept_id !== undefined || semester !== undefined || section !== undefined) {
      if (
        student.dept_id !== dept_id ||
        student.semester !== semester ||
        ownSection !== String(section).trim().toUpperCase()
      ) {
        throw createError("Access denied", 403);
      }
    }

    return filterOccurrences(occurrences, {
      dept_id: student.dept_id,
      semester: student.semester,
      section: ownSection,
    });
  }

  throw createError("Access denied", 403);
}

export async function getTodayTimetable(user_id, { now = new Date() } = {}) {
  const date = getKolkataDateOnly(now);

  if (!date) {
    throw createError("Unable to determine weekday for timetable", 500);
  }

  return getEffectiveTimetable(user_id, { date });
}

function proposedOccurrence(slot, date, overrides = {}) {
  return {
    timetable_id: slot.timetable_id,
    date,
    faculty_id: overrides.faculty_id ?? slot.faculty_id,
    dept_id: slot.dept_id,
    semester: slot.semester,
    section: slot.section,
    room: overrides.room ?? slot.room,
    start_time: overrides.start_time ?? slot.start_time,
    end_time: overrides.end_time ?? slot.end_time,
  };
}

export async function changeRoomTimeTimetable(user_id, timetable_id, timetableData) {
  await requireAdmin(user_id);

  if (timetableData?.exception_type !== "ROOM_TIME_CHANGE") {
    throw createError("Unsupported exception type", 400);
  }

  const { original_date, room, start_time, end_time, period, reason } = timetableData;
  requireOriginalDate(original_date);

  if (timetableData.rescheduled_date !== undefined) {
    throw createError("rescheduled_date is not allowed for room/time changes", 400);
  }

  const hasOverride =
    room !== undefined ||
    period !== undefined ||
    start_time !== undefined ||
    end_time !== undefined;

  if (!hasOverride) {
    throw createError("Provide a new room, period, or time for a room/time change", 400);
  }

  return withSerializableTransaction(async (tx) => {
    const slot = await tx.timetableSlot.findUnique({
      where: {
        timetable_id,
      },
    });

    if (!slot) {
      throw createError("Slot not found", 404);
    }

    assertDateMatchesSlotWeekday(slot, original_date);

    const timeCheck = validateMergedSlotTimes(slot, { start_time, end_time });
    if (!timeCheck.success) {
      throw createError(timeCheck.message, 400);
    }

    await assertOccurrenceAvailable(
      tx,
      proposedOccurrence(slot, original_date, {
        room: room ?? slot.room,
        start_time: timeCheck.merged.start_time,
        end_time: timeCheck.merged.end_time,
      }),
      { excludeTimetableId: timetable_id }
    );

    return createExceptionRecord(tx, {
      timetable_id,
      exception_type: "ROOM_TIME_CHANGE",
      original_date,
      ...(period !== undefined ? { period } : {}),
      ...(room !== undefined ? { room } : {}),
      ...(start_time !== undefined ? { start_time } : {}),
      ...(end_time !== undefined ? { end_time } : {}),
      ...(reason !== undefined ? { reason } : {}),
    });
  });
}

export async function substituteFacultyTimetable(user_id, timetable_id, timetableData) {
  await requireAdmin(user_id);

  if (timetableData?.exception_type !== "FACULTY_SUBSTITUTION") {
    throw createError("Unsupported exception type", 400);
  }

  const { original_date, replacement_faculty_id, reason } = timetableData;
  requireOriginalDate(original_date);

  if (!Number.isInteger(replacement_faculty_id) || replacement_faculty_id <= 0) {
    throw createError("Replacement faculty is required for faculty substitution", 400);
  }

  return withSerializableTransaction(async (tx) => {
    const slot = await tx.timetableSlot.findUnique({
      where: {
        timetable_id,
      },
    });

    if (!slot) {
      throw createError("Slot not found", 404);
    }

    assertDateMatchesSlotWeekday(slot, original_date);
    await assertReplacementFaculty(tx, replacement_faculty_id, slot);

    await assertOccurrenceAvailable(
      tx,
      proposedOccurrence(slot, original_date, { faculty_id: replacement_faculty_id }),
      { excludeTimetableId: timetable_id }
    );

    return createExceptionRecord(tx, {
      timetable_id,
      exception_type: "FACULTY_SUBSTITUTION",
      original_date,
      replacement_faculty_id,
      ...(reason !== undefined ? { reason } : {}),
    });
  });
}

export async function cancelTimetableOccurrence(user_id, timetable_id, timetableData) {
  await requireAdmin(user_id);

  if (timetableData?.exception_type !== "CANCELLED") {
    throw createError("Unsupported exception type", 400);
  }

  const { original_date, reason } = timetableData;
  requireOriginalDate(original_date);

  return withSerializableTransaction(async (tx) => {
    const slot = await tx.timetableSlot.findUnique({
      where: {
        timetable_id,
      },
    });

    if (!slot) {
      throw createError("Slot not found", 404);
    }

    assertDateMatchesSlotWeekday(slot, original_date);

    return createExceptionRecord(tx, {
      timetable_id,
      exception_type: "CANCELLED",
      original_date,
      ...(reason !== undefined ? { reason } : {}),
    });
  });
}

export async function rescheduleTimetableOccurrence(user_id, timetable_id, timetableData) {
  await requireAdmin(user_id);

  if (timetableData?.exception_type !== "RESCHEDULED") {
    throw createError("Unsupported exception type", 400);
  }

  const {
    original_date,
    rescheduled_date,
    replacement_faculty_id,
    period,
    room,
    start_time,
    end_time,
    reason,
  } = timetableData;

  requireOriginalDate(original_date);

  if (!(rescheduled_date instanceof Date) || Number.isNaN(rescheduled_date.getTime())) {
    throw createError("Rescheduled date is required when exception type is RESCHEDULED", 400);
  }

  if (rescheduled_date.getTime() === original_date.getTime()) {
    throw createError("Rescheduled date must be different from the original date", 400);
  }

  return withSerializableTransaction(async (tx) => {
    const slot = await tx.timetableSlot.findUnique({
      where: {
        timetable_id,
      },
    });

    if (!slot) {
      throw createError("Slot not found", 404);
    }

    assertDateMatchesSlotWeekday(slot, original_date);

    const timeCheck = validateMergedSlotTimes(slot, { start_time, end_time });
    if (!timeCheck.success) {
      throw createError(timeCheck.message, 400);
    }

    let faculty_id = slot.faculty_id;
    if (replacement_faculty_id !== undefined) {
      await assertReplacementFaculty(tx, replacement_faculty_id, slot);
      faculty_id = replacement_faculty_id;
    }

    await assertOccurrenceAvailable(
      tx,
      proposedOccurrence(slot, rescheduled_date, {
        faculty_id,
        room: room ?? slot.room,
        start_time: timeCheck.merged.start_time,
        end_time: timeCheck.merged.end_time,
      }),
      { excludeTimetableId: timetable_id }
    );

    return createExceptionRecord(tx, {
      timetable_id,
      exception_type: "RESCHEDULED",
      original_date,
      rescheduled_date,
      ...(replacement_faculty_id !== undefined ? { replacement_faculty_id } : {}),
      ...(period !== undefined ? { period } : {}),
      ...(room !== undefined ? { room } : {}),
      ...(start_time !== undefined ? { start_time } : {}),
      ...(end_time !== undefined ? { end_time } : {}),
      ...(reason !== undefined ? { reason } : {}),
    });
  });
}

export async function handleTimetableException(user_id, timetable_id, timetableData) {
  const { exception_type } = timetableData ?? {};

  switch (exception_type) {
    case "ROOM_TIME_CHANGE":
      return changeRoomTimeTimetable(user_id, timetable_id, timetableData);
    case "FACULTY_SUBSTITUTION":
      return substituteFacultyTimetable(user_id, timetable_id, timetableData);
    case "CANCELLED":
      return cancelTimetableOccurrence(user_id, timetable_id, timetableData);
    case "RESCHEDULED":
      return rescheduleTimetableOccurrence(user_id, timetable_id, timetableData);
    default:
      throw createError("Unsupported exception type", 400);
  }
}

export async function getTimetableExceptionById(exception_id, user_id) {
  if (!Number.isInteger(exception_id) || exception_id <= 0) {
    throw createError("Invalid timetable exception ID", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const exception = await prisma.timetableException.findUnique({
    where: {
      timetable_exception_id: exception_id,
    },
    include: TIMETABLE_EXCEPTION_READ_INCLUDE,
  });

  if (!exception) {
    throw createError("Exception not found", 404);
  }

  await authorizeSlotView(user, exception.timetable);
  return exception;
}

export async function listTimetableExceptions(timetable_id, user_id) {
  if (!Number.isInteger(timetable_id) || timetable_id <= 0) {
    throw createError("Invalid timetable ID", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
    select: USER_AUTH_SELECT,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const slot = await prisma.timetableSlot.findUnique({
    where: {
      timetable_id,
    },
    select: {
      timetable_id: true,
      dept_id: true,
      semester: true,
      section: true,
    },
  });

  if (!slot) {
    throw createError("Slot not found", 404);
  }

  await authorizeSlotView(user, slot);

  return prisma.timetableException.findMany({
    where: {
      timetable_id,
    },
    include: {
      replacement_faculty: {
        select: {
          faculty_id: true,
          full_name: true,
        },
      },
    },
    orderBy: [{ original_date: "asc" }, { timetable_exception_id: "asc" }],
  });
}

export async function deleteTimetableException(exception_id, user_id) {
  await requireAdmin(user_id);

  if (!Number.isInteger(exception_id) || exception_id <= 0) {
    throw createError("Invalid timetable exception ID", 400);
  }

  const exception = await prisma.timetableException.findUnique({
    where: {
      timetable_exception_id: exception_id,
    },
  });

  if (!exception) {
    throw createError("Exception not found", 404);
  }

  try {
    return await prisma.timetableException.delete({
      where: {
        timetable_exception_id: exception_id,
      },
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw createError("Exception not found", 404);
    }

    throw error;
  }
}
