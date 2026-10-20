import { z } from "zod";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "application/zip",
  "application/x-zip-compressed",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".zip",
]);

export const materialTypeSchema = z.enum([
  "LECTURE_NOTES",
  "PRESENTATIONS",
  "LAB_MANUALS",
  "REFERENCE_MATERIAL",
  "PREVIOUS_YEAR_PAPERS",
]);

export const notesMetadataSchema = z.object({
  subject_id: z.coerce
    .number()
    .int("Subject ID must be an integer")
    .positive("Subject ID must be positive"),

  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),

  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .transform((value) => value || undefined),

  unit_number: z.coerce
    .number()
    .int("Unit number must be an integer")
    .positive("Unit number must be positive"),

  material_type: materialTypeSchema,

  academic_year: z.coerce
    .number()
    .int("Academic year must be an integer")
    .min(2000, "Invalid academic year")
    .max(9999, "Invalid academic year"),
});

export function validateNotesFile(file) {
  if (!file) {
    return {
      success: false,
      message: "A material file is required",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
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

  const extension = file.originalname
    .slice(file.originalname.lastIndexOf("."))
    .toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      success: false,
      message: "Unsupported file extension",
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return {
      success: false,
      message: "Unsupported file MIME type",
    };
  }

  return { success: true };
}

export const replaceNotesSchema = notesMetadataSchema
  .omit({ subject_id: true })
  .partial();