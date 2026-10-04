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
