import { z } from "zod";

export const NOTIFICATION_TYPES = Object.freeze([
  "ASSIGNMENT_PUBLISHED",
  "ASSIGNMENT_DEADLINE_48H",
  "ASSIGNMENT_DEADLINE_12H",
  "ASSIGNMENT_GRADED",
  "NOTICE_PUBLISHED",
  "NOTES_UPLOADED",
]);

export const listNotificationsQuerySchema = z.object({
  unread_only: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return false;
      return value === "true" || value === "1";
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});
