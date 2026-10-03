import { z } from "zod";

export const createAssignmentSchema = z.object({
  subject_id: z.coerce
    .number()
    .int("Subject ID must be an integer")
    .positive("Subject ID must be positive"),

  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters"),

  description: z.string().trim().min(1, "Description cannot be empty"),

  section: z
    .string()
    .trim()
    .min(1, "Section cannot be empty")
    .max(20, "Section must not exceed 20 characters"),

  deadline: z.coerce.date().refine((date) => date > new Date(), "Deadline must be in the future"),

  max_marks: z.coerce
    .number()
    .int("Maximum marks must be an integer")
    .positive("Maximum marks must be positive"),

  allow_late: z.boolean().optional(),

  attachment_url: z.string().trim().url("Attachment URL must be a valid URL").optional(),
});

export const updateAssignmentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must not exceed 200 characters")
      .optional(),

    description: z.string().trim().min(1, "Description cannot be empty").optional(),

    deadline: z.coerce
      .date()
      .refine((date) => date > new Date(), "Deadline must be in the future")
      .optional(),

    max_marks: z.coerce
      .number()
      .int("Maximum marks must be an integer")
      .positive("Maximum marks must be positive")
      .optional(),

    allow_late: z.boolean().optional(),

    attachment_url: z.string().trim().url("Attachment URL must be a valid URL").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided for update");
