import { z } from "zod";

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE_YEAR = 2000;
const MAX_DATE_YEAR = 2100;

export const CALENDAR_ENTRY_TYPES = Object.freeze([
  "HOLIDAY",
  "EXAMINATION",
  "ASSIGNMENT_DEADLINE",
  "EVENT",
  "LAST_WORKING_DAY",
]);

/**
 * Parse a strict YYYY-MM-DD string into a UTC-midnight Date for
 * PostgreSQL @db.Date columns. Returns null for anything invalid.
 */
export function parseDateOnly(yyyyMmDd) {
  if (typeof yyyyMmDd !== "string" || !DATE_YYYY_MM_DD.test(yyyyMmDd)) {
    return null;
  }

  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  if (year < MIN_DATE_YEAR || year > MAX_DATE_YEAR) {
    return null;
  }

  return date;
}

export function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const dateOnlySchema = z
  .string()
  .trim()
  .regex(DATE_YYYY_MM_DD, "Date must be YYYY-MM-DD")
  .refine((value) => parseDateOnly(value) !== null, {
    message: "Date must be a valid YYYY-MM-DD calendar date",
  });

const academicYearSchema = z.coerce
  .number()
  .int("Academic year must be an integer")
  .min(2000, "Invalid academic year")
  .max(2100, "Invalid academic year");

const entryTypeSchema = z.enum(CALENDAR_ENTRY_TYPES, {
  message: "Invalid calendar entry type",
});

function refineDateRange(data, ctx) {
  const start = parseDateOnly(data.start_date);
  const end = parseDateOnly(data.end_date);

  if (start && end && end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "end_date must be on or after start_date",
    });
  }
}

export const createCalendarEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must not exceed 200 characters"),

    description: z
      .string()
      .trim()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .nullable()
      .transform((value) => value || null),

    entry_type: entryTypeSchema,

    start_date: dateOnlySchema,
    end_date: dateOnlySchema,

    academic_year: academicYearSchema,
  })
  .superRefine(refineDateRange);

export const updateCalendarEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must not exceed 200 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .nullable()
      .transform((value) => (value === undefined ? undefined : value || null)),

    entry_type: entryTypeSchema.optional(),

    start_date: dateOnlySchema.optional(),
    end_date: dateOnlySchema.optional(),

    academic_year: academicYearSchema.optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.entry_type !== undefined ||
      data.start_date !== undefined ||
      data.end_date !== undefined ||
      data.academic_year !== undefined,
    { message: "At least one field is required" }
  )
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date) {
      refineDateRange(data, ctx);
    }
  });
