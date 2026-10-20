import express from "express";

import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  createAssignmentController,
  getAssignmentByIdController,
  updateAssignmentByIdController,
  getMyAssignmentsController,
} from "../controllers/assignment.controller.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from "../validators/assignment.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("FACULTY"),
  validate(createAssignmentSchema),
  createAssignmentController
);

router.get("/my", authenticate, authorize("FACULTY"), getMyAssignmentsController);

router.get("/:id", authenticate, getAssignmentByIdController);

router.patch(
  "/:id",
  authenticate,
  authorize("FACULTY"),
  validate(updateAssignmentSchema),
  updateAssignmentByIdController
);

export default router;
