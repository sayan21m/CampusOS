import { z } from "zod";

export const createStudentSchema = z.object({
  userId: z.coerce.number().int("User ID must be an integer").positive("User ID must be positive"),

  roll_number: z
    .string()
    .trim()
    .min(2, "Roll number must be at least 2 characters")
    .max(15, "Roll number must not exceed 15 characters"),

  full_name: z.string().trim().min(1, "Name cannot be empty"),

  dept_id: z.coerce
    .number()
    .int("Department ID must be an integer")
    .positive("Department ID must be positive"),

  semester: z.coerce
    .number()
    .int("Semester must be an integer")
    .min(1, "Semester must be at least 1")
    .max(8, "Semester must not exceed 8"),

  section: z.string().trim().min(1, "Section cannot be empty"),

  admission_year: z.coerce
    .number()
    .int("Admission year must be an integer")
    .min(2000, "Invalid admission year"),

  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Valid phone number required")
    .optional(),

  photo_url: z.string().trim().url("Valid URL required").optional(),
});
