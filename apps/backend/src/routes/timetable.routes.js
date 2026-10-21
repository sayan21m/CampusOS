import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTimetableSlotSchema,
  updateTimetableSlotSchema,
  createTimetableExceptionBodySchema,
} from "../validators/timetable.validator.js";
import {
  createTimetableSlotController,
  updateTimetableSlotController,
  deletedSlotController,
  getTimetableController,
  getTodayTimetableController,
  getEffectiveTimetableController,
  createTimetableExceptionController,
  listTimetableExceptionsController,
  getTimetableExceptionController,
  deleteTimetableExceptionController,
} from "../controllers/timetable.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createTimetableSlotSchema),
  createTimetableSlotController
);

router.get(
  "/today",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  getTodayTimetableController
);

router.get(
  "/effective",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  getEffectiveTimetableController
);

router.get("/", authenticate, authorize("ADMIN", "FACULTY", "STUDENT"), getTimetableController);

router.get(
  "/exceptions/:exception_id",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  getTimetableExceptionController
);

router.delete(
  "/exceptions/:exception_id",
  authenticate,
  authorize("ADMIN"),
  deleteTimetableExceptionController
);

router.post(
  "/:timetable_id/exceptions",
  authenticate,
  authorize("ADMIN"),
  validate(createTimetableExceptionBodySchema),
  createTimetableExceptionController
);

router.get(
  "/:timetable_id/exceptions",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  listTimetableExceptionsController
);

router.patch(
  "/:timetable_id",
  authenticate,
  authorize("ADMIN"),
  validate(updateTimetableSlotSchema),
  updateTimetableSlotController
);

router.delete("/:timetable_id", authenticate, authorize("ADMIN"), deletedSlotController);

export default router;
