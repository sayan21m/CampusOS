import { parseDateOnly } from "../validators/timetable.validator.js";

export const TIMETABLE_SLOT_READ_INCLUDE = Object.freeze({
  subject: {
    select: {
      subject_id: true,
      subject_code: true,
      subject_name: true,
    },
  },
  faculty: {
    select: {
      faculty_id: true,
      full_name: true,
    },
  },
  department: {
    select: {
      dept_id: true,
      dept_name: true,
      dept_code: true,
    },
  },
});

export function toDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }

  return null;
}

export function sameCalendarDate(left, right) {
  const leftKey = toDateKey(left);
  const rightKey = toDateKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function getKolkataDayOfWeek(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);

  const dayMap = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return dayMap[weekday] ?? null;
}

export function getKolkataDateOnly(date = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return parseDateOnly(key);
}

export function buildEffectiveOccurrence(slot, targetDate, exception = null) {
  const facultyId = exception?.replacement_faculty_id ?? slot.faculty_id;
  const facultyMatchesSlot = facultyId === slot.faculty_id;

  return {
    timetable_id: slot.timetable_id,
    timetable_exception_id: exception?.timetable_exception_id ?? null,
    exception_type: exception?.exception_type ?? null,
    date: toDateKey(targetDate),
    subject_id: slot.subject_id,
    faculty_id: facultyId,
    dept_id: slot.dept_id,
    semester: slot.semester,
    section: slot.section,
    day_of_week: getKolkataDayOfWeek(targetDate),
    period: exception?.period ?? slot.period,
    room: exception?.room ?? slot.room,
    start_time: exception?.start_time ?? slot.start_time,
    end_time: exception?.end_time ?? slot.end_time,
    subject: slot.subject,
    // Prefer replacement_faculty when loaded; never report the original nested
    // faculty object for a substituted occurrence (faculty_id would disagree).
    faculty: facultyMatchesSlot ? slot.faculty : (exception?.replacement_faculty ?? null),
    department: slot.department,
  };
}

export function resolveOccurrenceOnDate(slot, targetDate, exceptions = []) {
  if (!slot) {
    return null;
  }

  const relevant = (Array.isArray(exceptions) ? exceptions : []).filter(
    (exception) =>
      exception.timetable_id === undefined || exception.timetable_id === slot.timetable_id
  );

  const inbound = relevant.find(
    (exception) =>
      exception.exception_type === "RESCHEDULED" &&
      sameCalendarDate(exception.rescheduled_date, targetDate)
  );

  if (inbound) {
    return buildEffectiveOccurrence(slot, targetDate, inbound);
  }

  if (slot.day_of_week !== getKolkataDayOfWeek(targetDate)) {
    return null;
  }

  const original = relevant.find((exception) =>
    sameCalendarDate(exception.original_date, targetDate)
  );

  if (!original) {
    return buildEffectiveOccurrence(slot, targetDate, null);
  }

  if (original.exception_type === "CANCELLED" || original.exception_type === "RESCHEDULED") {
    return null;
  }

  return buildEffectiveOccurrence(slot, targetDate, original);
}

export function occurrenceConflictKind(left, right) {
  if (!left || !right) {
    return null;
  }

  // Compare calendar dates via toDateKey so Date objects and YYYY-MM-DD strings match.
  if (left.timetable_id === right.timetable_id && sameCalendarDate(left.date, right.date)) {
    return null;
  }

  if (!timesOverlap(left.start_time, left.end_time, right.start_time, right.end_time)) {
    return null;
  }

  if (left.room === right.room) {
    return "room";
  }

  if (left.faculty_id === right.faculty_id) {
    return "faculty";
  }

  if (
    left.dept_id === right.dept_id &&
    left.semester === right.semester &&
    left.section === right.section
  ) {
    return "section";
  }

  return null;
}

export function filterOccurrences(occurrences, scope = {}) {
  return occurrences.filter((occurrence) => {
    if (scope.faculty_id !== undefined && occurrence.faculty_id !== scope.faculty_id) {
      return false;
    }

    if (scope.dept_id !== undefined && occurrence.dept_id !== scope.dept_id) {
      return false;
    }

    if (scope.semester !== undefined && occurrence.semester !== scope.semester) {
      return false;
    }

    if (scope.section !== undefined && occurrence.section !== scope.section) {
      return false;
    }

    return true;
  });
}

function matchesExtraSlotWhere(slot, extraSlotWhere = {}) {
  return Object.entries(extraSlotWhere).every(([key, value]) => slot[key] === value);
}

export async function loadOccurrencesForDate(db, targetDate, { extraSlotWhere = {} } = {}) {
  const dayOfWeek = getKolkataDayOfWeek(targetDate);

  const weeklySlots = await db.timetableSlot.findMany({
    where: {
      day_of_week: dayOfWeek,
      ...extraSlotWhere,
    },
    include: {
      ...TIMETABLE_SLOT_READ_INCLUDE,
      exceptions: {
        where: {
          OR: [{ original_date: targetDate }, { rescheduled_date: targetDate }],
        },
      },
    },
    orderBy: [{ period: "asc" }, { start_time: "asc" }],
  });

  const inbound = await db.timetableException.findMany({
    where: {
      exception_type: "RESCHEDULED",
      rescheduled_date: targetDate,
    },
    include: {
      timetable: {
        include: TIMETABLE_SLOT_READ_INCLUDE,
      },
    },
  });

  const seen = new Set();
  const occurrences = [];

  for (const slot of weeklySlots) {
    const occurrence = resolveOccurrenceOnDate(slot, targetDate, slot.exceptions);
    if (occurrence) {
      seen.add(slot.timetable_id);
      occurrences.push(occurrence);
    }
  }

  for (const exception of inbound) {
    const slot = exception.timetable;
    if (!slot || seen.has(slot.timetable_id) || !matchesExtraSlotWhere(slot, extraSlotWhere)) {
      continue;
    }

    const occurrence = resolveOccurrenceOnDate(slot, targetDate, [exception]);
    if (occurrence) {
      occurrences.push(occurrence);
    }
  }

  occurrences.sort((left, right) => {
    if (left.period !== right.period) {
      return left.period - right.period;
    }

    return String(left.start_time).localeCompare(String(right.start_time));
  });

  return occurrences;
}
