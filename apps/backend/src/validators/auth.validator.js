import { z } from "zod";
import { newPasswordSchema } from "./password.validator.js";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email is required"),
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: newPasswordSchema,
});
