import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  classRosterQuerySchema,
  markAttendanceSchema,
  subjectReportQuerySchema,
  updateAttendanceSchema,
} from "../validators/attendance.validator.js";
import {
  exportSubjectReportController,
  getClassRosterController,
  getMyAttendanceController,
  getSubjectReportController,
  markAttendanceController,
  updateAttendanceController,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.get("/me", authenticate, authorize("STUDENT"), getMyAttendanceController);

router.get(
  "/class",
  authenticate,
  authorize("FACULTY"),
  validate(classRosterQuerySchema, "query"),
  getClassRosterController
);

router.get(
  "/subject/:subjectId/export",
  authenticate,
  authorize("FACULTY"),
  validate(subjectReportQuerySchema, "query"),
  exportSubjectReportController
);

router.get(
  "/subject/:subjectId",
  authenticate,
  authorize("FACULTY"),
  validate(subjectReportQuerySchema, "query"),
  getSubjectReportController
);

router.post(
  "/",
  authenticate,
  authorize("FACULTY"),
  validate(markAttendanceSchema),
  markAttendanceController
);

router.patch(
  "/:id",
  authenticate,
  authorize("FACULTY"),
  validate(updateAttendanceSchema),
  updateAttendanceController
);

export default router;
