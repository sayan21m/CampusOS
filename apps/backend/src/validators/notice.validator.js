import { z } from "zod";

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg"]);

export function validateNoticeAttachment(file) {
  if (!file) {
    return { success: true };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      success: false,
      message: "File size must not exceed 25 MB",
    };
  }

  if (file.size <= 0) {
    return {
      success: false,
      message: "Uploaded file cannot be empty",
    };
  }

  const name = String(file.originalname || "");
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      success: false,
      message: "Unsupported file extension",
    };
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return {
      success: false,
      message: "Unsupported file MIME type",
    };
  }

  return { success: true };
}

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
