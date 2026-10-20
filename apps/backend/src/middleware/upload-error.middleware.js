import multer from "multer";

export function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "File size must not exceed 25 MB",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }

  next(error);
}
