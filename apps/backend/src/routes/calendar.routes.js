import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCalendarEntrySchema,
  updateCalendarEntrySchema,
} from "../validators/calendar.validator.js";
import {
  createCalendarEntryController,
  deleteCalendarEntryController,
  getCalendarEntryController,
  listCalendarEntriesController,
  updateCalendarEntryController,
} from "../controllers/calendar.controller.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  listCalendarEntriesController
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "FACULTY", "STUDENT"),
  getCalendarEntryController
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCalendarEntrySchema),
  createCalendarEntryController
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateCalendarEntrySchema),
  updateCalendarEntryController
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteCalendarEntryController
);

export default router;
