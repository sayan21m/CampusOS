import { z } from "zod";

export const createSubjectSchema = z.object({
  subject_code: z.string().trim().min(2, "Subject code must be at least 2 characters"),

  subject_name: z.string().trim().min(3, "Subject name must be atlest 3 characters"),

  dept_id: z.coerce
    .number()
    .int("Department ID must be an integer")
    .positive("Department ID must be positive"),

  semester: z.coerce
    .number()
    .int("Semester must be an integer")
    .min(1, "Semester must be at least 1")
    .max(8, "Semester must not exceed 8"),

  credits: z.coerce.number().int("Credit must be at integer").min(1, "Credit must be at least 1"),

  is_active: z.boolean().optional(),
});
