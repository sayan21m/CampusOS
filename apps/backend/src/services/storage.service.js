import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_ROOT = path.resolve("apps/backend/storage");

const SUBMISSIONS_DIR = path.join(STORAGE_ROOT, "submissions");

export async function saveSubmissionFile({ file, assignment_id, student_id }) {
  if (!file) {
    throw new Error("No file provided");
  }

  const assignmentDirectory = path.join(SUBMISSIONS_DIR, `assignment-${assignment_id}`);

  const studentDirectory = path.join(assignmentDirectory, `student-${student_id}`);

  await fs.mkdir(studentDirectory, {
    recursive: true,
  });

  const extension = path.extname(file.originalname).toLowerCase();
  const generatedFilename = `${crypto.randomUUID()}${extension}`;

  const absolutePath = path.join(studentDirectory, generatedFilename);

  await fs.writeFile(absolutePath, file.buffer);

  const relativePath = path.relative(STORAGE_ROOT, absolutePath).split(path.sep).join("/");

  return {
    filename: generatedFilename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: relativePath,
  };
}

export async function deleteSubmissionFile(relativePath) {
  if (!relativePath) {
    return;
  }

  const absolutePath = path.resolve(STORAGE_ROOT, relativePath);

  const submissionsRoot = path.resolve(SUBMISSIONS_DIR);

  if (
    absolutePath !== submissionsRoot &&
    !absolutePath.startsWith(`${submissionsRoot}${path.sep}`)
  ) {
    throw new Error("Invalid submission file path");
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
