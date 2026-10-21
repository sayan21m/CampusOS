import { z } from "zod";
import { parseDateOnly } from "./calendar.validator.js";

export const SEARCH_TYPES = Object.freeze([
  "NOTICE",
  "NOTES",
  "ASSIGNMENT",
  "USER",
  "SUBJECT",
  "EVENT",
]);

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => parseDateOnly(value) !== null, {
    message: "Date must be a valid YYYY-MM-DD calendar date",
  });

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1, "Search query is required").max(100),
    type: z.enum(SEARCH_TYPES, { message: "Invalid search type" }).optional(),
    subject_id: z.coerce.number().int().positive().optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && parseDateOnly(data.to) < parseDateOnly(data.from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });
