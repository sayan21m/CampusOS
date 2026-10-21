import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  getUnreadCountController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  processDeadlineRemindersController,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  listNotificationsController
);

router.get(
  "/unread-count",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  getUnreadCountController
);

router.patch(
  "/read-all",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  markAllNotificationsReadController
);

router.patch(
  "/:id/read",
  authorize("ADMIN", "FACULTY", "STUDENT"),
  markNotificationReadController
);

router.post(
  "/process-deadline-reminders",
  authorize("ADMIN"),
  processDeadlineRemindersController
);

export default router;
