import { z } from "zod";

export const createFacultySchema = z.object({
  userId: z.coerce.number().int("User ID must be an integer").positive("User ID must be positive"),

  employee_id: z
    .string()
    .trim()
    .min(2, "Employee ID must be at least 2 characters")
    .max(15, "Employee ID must not exceed 15 characters"),

  full_name: z.string().trim().min(1, "Name cannot be empty"),

  dept_id: z.coerce
    .number()
    .int("Department ID must be an integer")
    .positive("Department ID must be positive"),

  designation: z.string().trim().min(3, "Designation must be at least 3 characters"),

  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Valid phone number required")
    .optional(),

  photo_url: z.string().trim().url("Valid URL required").optional(),
});
