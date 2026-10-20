import multer from "multer";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const storage = multer.memoryStorage();

export const uploadSubmission = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadNotes = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 10,
  },
});

export const uploadNotesFile = uploadNotes.single("file");