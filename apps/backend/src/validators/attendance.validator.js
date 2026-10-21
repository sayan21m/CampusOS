import { z } from "zod";
import { parseDateOnly } from "./calendar.validator.js";

export const ATTENDANCE_STATUSES = Object.freeze(["PRESENT", "ABSENT"]);
export const ATTENDANCE_CORRECTION_DAYS = 7;
export const ATTENDANCE_THRESHOLD_PERCENT = 75;

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => parseDateOnly(value) !== null, {
    message: "Date must be a valid YYYY-MM-DD calendar date",
  });

const positiveIntSchema = z.coerce
  .number()
  .int("Must be an integer")
  .positive("Must be a positive integer");

const statusSchema = z.enum(ATTENDANCE_STATUSES, {
  message: "status must be PRESENT or ABSENT",
});

export const classRosterQuerySchema = z.object({
  timetable_id: positiveIntSchema,
  class_date: dateOnlySchema,
});

export const subjectReportQuerySchema = z.object({
  section: z.string().trim().min(1).optional(),
});

export const markAttendanceSchema = z
  .object({
    timetable_id: positiveIntSchema,
    class_date: dateOnlySchema,
    mark_all_present: z.boolean().optional(),
    records: z
      .array(
        z.object({
          student_id: positiveIntSchema,
          status: statusSchema,
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.mark_all_present && (!data.records || data.records.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["records"],
        message: "records are required unless mark_all_present is true",
      });
    }
  });

export const updateAttendanceSchema = z.object({
  status: statusSchema,
});
