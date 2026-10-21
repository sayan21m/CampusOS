import { z } from "zod";

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include a letter and a number";

export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");
