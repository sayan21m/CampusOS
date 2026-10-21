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

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || "").toLowerCase();
    const okMime =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "text/plain";

    if (okMime || name.endsWith(".csv")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only CSV files are allowed"));
  },
});

export const uploadCsvFile = uploadCsv.single("file");

const uploadNotice = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 12,
  },
});

export const uploadNoticeFile = uploadNotice.single("file");

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export const uploadProfilePhoto = uploadPhoto.single("file");

export function optionalSingleUpload(upload) {
  return (req, res, next) => {
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      upload(req, res, next);
      return;
    }
    next();
  };
}