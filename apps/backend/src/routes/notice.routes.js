import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { createNoticeSchema } from "../validators/notice.validator.js";
import { optionalSingleUpload, uploadNoticeFile } from "../middleware/upload.middleware.js";
import {
  createNoticeController,
  downloadNoticeAttachmentController,
  getNoticeController,
  markNoticeReadController,
} from "../controllers/notice.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "FACULTY"),
  optionalSingleUpload(uploadNoticeFile),
  validate(createNoticeSchema),
  createNoticeController
);

router.get("/", authenticate, getNoticeController);

router.post(
  "/:id/read",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  markNoticeReadController
);

router.get(
  "/:id/attachment",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  downloadNoticeAttachmentController
);

export default router;
