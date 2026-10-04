import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadSubmission } from "../middleware/upload.middleware.js";
import { createSubmissionController } from "../controllers/submission.controller.js";

const router = express.Router();

router.post(
  "/assignments/:id",
  authenticate,
  authorize("STUDENT"),
  uploadSubmission.single("file"),
  createSubmissionController
);

export default router;
