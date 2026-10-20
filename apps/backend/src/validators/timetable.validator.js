import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const SECTION_PATTERN = /^[A-Za-z0-9-]+$/;
const ROOM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._#/-]*$/;

/** Accepted calendar range to protect the DB from typos like 0226-10-12. */
const MIN_DATE_YEAR = 2000;
const MAX_DATE_YEAR = 2100;

export const TIMETABLE_EXCEPTION_TYPES = Object.freeze([
  "ROOM_TIME_CHANGE",
  "FACULTY_SUBSTITUTION",
  "CANCELLED",
  "RESCHEDULED",
]);

/**
 * Fields each exception type is allowed to carry beyond
 * timetable_id / exception_type / original_date / reason.
 */
const EXCEPTION_ALLOWED_FIELDS = Object.freeze({
  ROOM_TIME_CHANGE: Object.freeze(["period", "room", "start_time", "end_time"]),
  FACULTY_SUBSTITUTION: Object.freeze(["replacement_faculty_id"]),
  CANCELLED: Object.freeze([]),
  RESCHEDULED: Object.freeze([
    "rescheduled_date",
    "replacement_faculty_id",
    "period",
    "room",
    "start_time",
    "end_time",
  ]),
});

const EXCEPTION_OPTIONAL_FIELDS = Object.freeze([
  "rescheduled_date",
  "replacement_faculty_id",
  "period",
  "room",
  "start_time",
  "end_time",
]);

// ---------------------------------------------------------------------------
// Helpers (exported for reuse by services/tests)
// ---------------------------------------------------------------------------

/** True only when both times are present, well-formed, and end > start. */
export function isEndAfterStart(start_time, end_time) {
  return Boolean(
    typeof start_time === "string" &&
    typeof end_time === "string" &&
    TIME_HH_MM.test(start_time) &&
    TIME_HH_MM.test(end_time) &&
    end_time > start_time
  );
}

/**
 * Parse a strict YYYY-MM-DD string into a UTC-midnight Date for
 * PostgreSQL @db.Date columns. Returns null for anything invalid
 * (wrong type, malformed string, impossible calendar date).
 */
export function parseDateOnly(yyyyMmDd) {
  if (typeof yyyyMmDd !== "string" || !DATE_YYYY_MM_DD.test(yyyyMmDd)) {
    return null;
  }

  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates that Date would silently roll over (e.g. 2026-02-30).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Validate the FINAL time range of a timetable slot after merging a
 * partial update with the existing database record.
 *
 * The update schema can only check fields present in the request, so a
 * patch like { start_time: "10:00" } against a stored end_time of
 * "09:50" would pass schema validation while producing an invalid slot.
 * Services must call this with the merged result before persisting.
 *
 * Pure function — no database access. Returns:
 *   { success: true, merged }
 *   { success: false, message }
 */
export function validateMergedSlotTimes(existing, patch = {}) {
  if (!existing || typeof existing !== "object") {
    return { success: false, message: "Existing slot record is required" };
  }

  const start_time = patch.start_time !== undefined ? patch.start_time : existing.start_time;
  const end_time = patch.end_time !== undefined ? patch.end_time : existing.end_time;

  if (typeof start_time !== "string" || !TIME_HH_MM.test(start_time)) {
    return { success: false, message: "Start time must be in HH:MM 24-hour format" };
  }

  if (typeof end_time !== "string" || !TIME_HH_MM.test(end_time)) {
    return { success: false, message: "End time must be in HH:MM 24-hour format" };
  }

  if (!isEndAfterStart(start_time, end_time)) {
    return { success: false, message: "End time must be after start time" };
  }

  return { success: true, merged: { start_time, end_time } };
}

/**
 * Format a valid Date (or date-like value) as YYYY-MM-DD in UTC.
 * Returns null when the input cannot be interpreted as a valid date.
 */
export function formatDateOnly(date) {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------

/**
 * Strict positive integer. Accepts a number or a purely numeric string
 * (so JSON bodies and query params both work) but rejects booleans,
 * null, arrays, floats, exponent notation, and unsafe magnitudes that
 * plain z.coerce.number() would silently convert.
 */
const positiveInt = (label) =>
  z.preprocess(
    (value) => {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number(value.trim());
      }
      return value;
    },
    z
      .number(`${label} must be a number`)
      .int(`${label} must be an integer`)
      .positive(`${label} must be positive`)
      .max(Number.MAX_SAFE_INTEGER, `${label} is too large`)
  );

const boundedInt = (label, min, max, rangeMessage) =>
  z.preprocess(
    (value) => {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number(value.trim());
      }
      return value;
    },
    z
      .number(`${label} must be a number`)
      .int(`${label} must be an integer`)
      .min(min, rangeMessage)
      .max(max, rangeMessage)
  );

const timeField = z
  .string("Time must be a string in HH:MM 24-hour format")
  .trim()
  .regex(TIME_HH_MM, "Time must be in HH:MM 24-hour format");

const sectionField = z
  .string("Section must be a string")
  .trim()
  .min(1, "Section cannot be empty")
  .max(20, "Section must not exceed 20 characters")
  .regex(SECTION_PATTERN, "Section may only contain letters, digits, and hyphens")
  .transform((value) => value.toUpperCase());

const semesterField = boundedInt("Semester", 1, 8, "Semester must be between 1 and 8");

const dayOfWeekField = boundedInt(
  "Day of week",
  1,
  7,
  "Day of week must be between 1 (Mon) and 7 (Sun)"
);

const periodField = boundedInt("Period", 1, 12, "Period must be between 1 and 12");

const roomField = z
  .string("Room must be a string")
  .trim()
  .min(1, "Room cannot be empty")
  .max(50, "Room must not exceed 50 characters")
  .regex(ROOM_PATTERN, "Room contains invalid characters");

/** Strict YYYY-MM-DD calendar date → UTC-midnight Date, within a sane year range. */
const dateOnlyField = z
  .string("Date must be a string in YYYY-MM-DD format")
  .trim()
  .date("Date must be a valid YYYY-MM-DD calendar date")
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    return year >= MIN_DATE_YEAR && year <= MAX_DATE_YEAR;
  }, `Date year must be between ${MIN_DATE_YEAR} and ${MAX_DATE_YEAR}`)
  .transform((value) => parseDateOnly(value))
  .refine((value) => value !== null, "Date must be a valid YYYY-MM-DD calendar date");

const reasonField = z
  .string("Reason must be a string")
  .trim()
  .min(1, "Reason cannot be empty")
  .max(500, "Reason must not exceed 500 characters")
  // Strip control characters without touching normal whitespace.
  // eslint-disable-next-line no-control-regex
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
    message: "Reason contains invalid control characters",
  });

// ---------------------------------------------------------------------------
// Cross-field refinements
// ---------------------------------------------------------------------------

function refineEndAfterStart(data, ctx) {
  if (data.start_time !== undefined && data.end_time !== undefined) {
    if (!isEndAfterStart(data.start_time, data.end_time)) {
      ctx.addIssue({
        code: "custom",
        path: ["end_time"],
        message: "End time must be after start time",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createTimetableSlotSchema = z
  .strictObject({
    subject_id: positiveInt("Subject ID"),
    faculty_id: positiveInt("Faculty ID"),
    dept_id: positiveInt("Department ID"),
    semester: semesterField,
    section: sectionField,
    day_of_week: dayOfWeekField,
    period: periodField,
    room: roomField,
    start_time: timeField,
    end_time: timeField,
  })
  .superRefine(refineEndAfterStart);

export const updateTimetableSlotSchema = z
  .strictObject({
    subject_id: positiveInt("Subject ID").optional(),
    faculty_id: positiveInt("Faculty ID").optional(),
    dept_id: positiveInt("Department ID").optional(),
    semester: semesterField.optional(),
    section: sectionField.optional(),
    day_of_week: dayOfWeekField.optional(),
    period: periodField.optional(),
    room: roomField.optional(),
    start_time: timeField.optional(),
    end_time: timeField.optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "At least one field must be provided for update"
  )
  .superRefine(refineEndAfterStart);

function refineTimetableException(data, ctx) {
  refineEndAfterStart(data, ctx);

  const allowed = EXCEPTION_ALLOWED_FIELDS[data.exception_type] ?? [];

  for (const field of EXCEPTION_OPTIONAL_FIELDS) {
    if (data[field] !== undefined && !allowed.includes(field)) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `${field} is not allowed when exception type is ${data.exception_type}`,
      });
    }
  }

  switch (data.exception_type) {
    case "FACULTY_SUBSTITUTION": {
      if (data.replacement_faculty_id === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["replacement_faculty_id"],
          message: "Replacement faculty is required for faculty substitution",
        });
      }
      break;
    }

    case "RESCHEDULED": {
      if (data.rescheduled_date === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["rescheduled_date"],
          message: "Rescheduled date is required when exception type is RESCHEDULED",
        });
      } else if (
        data.original_date instanceof Date &&
        data.rescheduled_date instanceof Date &&
        data.rescheduled_date.getTime() === data.original_date.getTime()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["rescheduled_date"],
          message: "Rescheduled date must be different from the original date",
        });
      }
      break;
    }

    case "ROOM_TIME_CHANGE": {
      const hasOverride =
        data.room !== undefined ||
        data.period !== undefined ||
        data.start_time !== undefined ||
        data.end_time !== undefined;

      if (!hasOverride) {
        ctx.addIssue({
          code: "custom",
          path: ["room"],
          message: "Provide a new room, period, or time for a room/time change",
        });
      }
      break;
    }

    default:
      break;
  }
}

const exceptionPayloadFields = {
  exception_type: z.enum(TIMETABLE_EXCEPTION_TYPES, "Invalid exception type"),
  original_date: dateOnlyField,
  rescheduled_date: dateOnlyField.optional(),
  replacement_faculty_id: positiveInt("Replacement faculty ID").optional(),
  period: periodField.optional(),
  room: roomField.optional(),
  start_time: timeField.optional(),
  end_time: timeField.optional(),
  reason: reasonField.optional(),
};

export const createTimetableExceptionSchema = z
  .strictObject({
    timetable_id: positiveInt("Timetable ID"),
    ...exceptionPayloadFields,
  })
  .superRefine(refineTimetableException);

export const createTimetableExceptionBodySchema = z
  .strictObject(exceptionPayloadFields)
  .superRefine(refineTimetableException);
