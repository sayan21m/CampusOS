import { z } from "zod";

export const createDepartmentSchema = z.object({
  dept_name: z.string().trim().min(2, "Department name must be at least 2 characters"),

  dept_code: z
    .string()
    .trim()
    .min(2, "Department code must be at least 2 characters")
    .max(10, "Department code must not exceed 10 characters")
    .toUpperCase(),
});

export const updateDepartmentSchema = z
  .object({
    dept_name: z.string().trim().min(2, "Department name must be at least 2 characters").optional(),

    dept_code: z
      .string()
      .trim()
      .min(2, "Department code must be at least 2 characters")
      .max(10, "Department code must not exceed 10 characters")
      .toUpperCase()
      .optional(),
  })
  .refine((data) => data.dept_name !== undefined || data.dept_code !== undefined, {
    message: "At least one field is required",
  });
