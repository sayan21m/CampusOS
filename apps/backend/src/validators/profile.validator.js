import { z } from "zod";

export const EMAIL_CATEGORIES = Object.freeze([
  "ASSIGNMENTS",
  "DEADLINES",
  "NOTICES",
  "NOTES",
  "ATTENDANCE",
]);

export const NOTIFICATION_EMAIL_CATEGORY = Object.freeze({
  ASSIGNMENT_PUBLISHED: "ASSIGNMENTS",
  ASSIGNMENT_GRADED: "ASSIGNMENTS",
  ASSIGNMENT_DEADLINE_48H: "DEADLINES",
  ASSIGNMENT_DEADLINE_12H: "DEADLINES",
  NOTICE_PUBLISHED: "NOTICES",
  NOTES_UPLOADED: "NOTES",
  ATTENDANCE_SHORTAGE: "ATTENDANCE",
});

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function validateProfilePhoto(file) {
  if (!file) {
    return {
      success: false,
      message: "A photo file is required",
    };
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return {
      success: false,
      message: "Photo size must not exceed 5 MB",
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

  if (!ALLOWED_PHOTO_EXT.has(extension)) {
    return {
      success: false,
      message: "Photo must be a JPG, PNG, or WEBP image",
    };
  }

  if (file.mimetype && !ALLOWED_PHOTO_MIME.has(file.mimetype)) {
    return {
      success: false,
      message: "Photo must be a JPG, PNG, or WEBP image",
    };
  }

  return { success: true };
}

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z.enum(EMAIL_CATEGORIES, { message: "Invalid email category" }),
        email_enabled: z.boolean(),
      })
    )
    .min(1)
    .max(EMAIL_CATEGORIES.length),
});
