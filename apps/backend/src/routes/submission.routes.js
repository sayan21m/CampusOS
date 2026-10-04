import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { gradeSubmissionSchema } from "../validators/assignment.validator.js";
import { uploadSubmission } from "../middleware/upload.middleware.js";
import {
  createSubmissionController,
  getAssignmentSubmissionsController,
  gradeSubmissionController,
} from "../controllers/submission.controller.js";

const router = express.Router();

router.post(
  "/assignments/:id",
  authenticate,
  authorize("STUDENT"),
  uploadSubmission.single("file"),
  createSubmissionController
);

router.get(
  "/assignments/:id",
  authenticate,
  authorize("FACULTY"),
  getAssignmentSubmissionsController
);

router.patch(
  "/:id/grade",
  authenticate,
  authorize("FACULTY"),
  validate(gradeSubmissionSchema),
  gradeSubmissionController
);

export default router;
