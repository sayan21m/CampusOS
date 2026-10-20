import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_ROOT = path.resolve("apps/backend/storage");
const NOTES_DIR = path.join(STORAGE_ROOT, "notes");

export async function saveNotesFile({
  file,
  subject_id,
  academic_year,
  unit_number,
  faculty_id,
}) {
  if (!file?.buffer?.length) {
    throw new Error("No file provided or file is empty");
  }

  const directory = path.join(
    NOTES_DIR,
    `notes-${subject_id}-${academic_year}-${faculty_id}`,
    `unit-${unit_number}`
  );

  await fs.mkdir(directory, { recursive: true });

  const extension = path.extname(file.originalname).toLowerCase();
  const generatedFilename = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(directory, generatedFilename);

  await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });

  return {
    filename: generatedFilename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: path.relative(STORAGE_ROOT, absolutePath).split(path.sep).join("/"),
  };
}

export async function deleteNotesFile(storageKey) {
  const absolutePath = path.resolve(STORAGE_ROOT, storageKey);
  const relative = path.relative(STORAGE_ROOT, absolutePath);

  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid storage key");
  }

  await fs.unlink(absolutePath);
}
