import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_ROOT = path.resolve("apps/backend/storage");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function resolveStoredPath(storageKey) {
  if (!storageKey) {
    throw createError("Invalid storage key", 400);
  }

  const absolutePath = path.resolve(STORAGE_ROOT, storageKey);
  const relative = path.relative(STORAGE_ROOT, absolutePath);

  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw createError("Invalid storage key", 400);
  }

  return absolutePath;
}

export async function saveStoredFile({ file, directory }) {
  if (!file?.buffer?.length) {
    throw createError("No file provided or file is empty", 400);
  }

  const absoluteDirectory = path.join(STORAGE_ROOT, directory);
  await fs.mkdir(absoluteDirectory, { recursive: true });

  const extension = path.extname(file.originalname || "").toLowerCase();
  const generatedFilename = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(absoluteDirectory, generatedFilename);

  await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });

  return {
    filename: generatedFilename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: path.relative(STORAGE_ROOT, absolutePath).split(path.sep).join("/"),
  };
}

export async function deleteStoredFile(storageKey) {
  if (!storageKey) {
    return;
  }

  try {
    await fs.unlink(resolveStoredPath(storageKey));
  } catch (error) {
    if (error.code !== "ENOENT" && error.statusCode !== 400) {
      console.error("Failed to delete stored file:", error.message || error);
    }
  }
}

export function safeDownloadName(title, extension) {
  const safeTitle =
    String(title || "file")
      .replace(/[\\/:*?"<>|\r\n]/g, "_")
      .trim()
      .slice(0, 150) || "file";

  return `${safeTitle}${extension || ""}`;
}
