import { z } from "zod";
import { newPasswordSchema } from "./password.validator.js";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Valid phone number required")
  .optional();

export const listUsersQuerySchema = z.object({
  role: z.enum(["STUDENT", "FACULTY", "ADMIN"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  search: z.string().trim().max(100).optional(),
});

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Valid email is required"),
    password: newPasswordSchema,
    role: z.enum(["STUDENT", "FACULTY"]),
    roll_number: z.string().trim().min(2).max(15).optional(),
    employee_id: z.string().trim().min(2).max(15).optional(),
    full_name: z.string().trim().min(1).optional(),
    dept_id: z.coerce.number().int().positive().optional(),
    semester: z.coerce.number().int().min(1).max(8).optional(),
    section: z.string().trim().min(1).optional(),
    admission_year: z.coerce.number().int().min(2000).optional(),
    designation: z.string().trim().min(3).optional(),
    phone: phoneSchema,
  })
  .superRefine((data, ctx) => {
    if (data.role === "STUDENT") {
      for (const field of ["roll_number", "dept_id", "semester", "section", "admission_year"]) {
        if (data[field] === undefined || data[field] === "") {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required for STUDENT accounts`,
          });
        }
      }
    }

    if (data.role === "FACULTY") {
      for (const field of ["employee_id", "dept_id", "designation"]) {
        if (data[field] === undefined || data[field] === "") {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required for FACULTY accounts`,
          });
        }
      }
    }
  });

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    full_name: z.string().trim().min(1).optional(),
    dept_id: z.coerce.number().int().positive().optional(),
    semester: z.coerce.number().int().min(1).max(8).optional(),
    section: z.string().trim().min(1).optional(),
    admission_year: z.coerce.number().int().min(2000).optional(),
    designation: z.string().trim().min(3).optional(),
    phone: phoneSchema,
    roll_number: z.string().trim().min(2).max(15).optional(),
    employee_id: z.string().trim().min(2).max(15).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export const adminResetPasswordSchema = z.object({
  newPassword: newPasswordSchema,
});
