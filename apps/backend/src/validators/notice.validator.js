import { z } from "zod";

export const createNoticeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters"),

  content: z.string().trim().min(1, "Content cannot be empty"),

  category: z.enum(["academic", "exam", "event", "holiday", "urgent"], "Invalid notice category"),

  priority: z.enum(["normal", "important", "urgent"], "Invalid notice priority"),

  target_type: z.enum(["all", "dept", "year", "section"], "Invalid target type"),

  target_value: z.string().trim().min(1, "Target value cannot be empty"),
});
