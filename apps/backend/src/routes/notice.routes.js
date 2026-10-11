import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { createNoticeSchema } from "../validators/notice.validator.js";
import { createNoticeController, getNoticeController } from "../controllers/notice.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMINISTRATOR", "FACULTY"),
  validate(createNoticeSchema),
  createNoticeController
);

router.get("/", authenticate, getNoticeController);

export default router;
