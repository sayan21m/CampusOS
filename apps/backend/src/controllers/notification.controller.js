import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processDeadlineReminders,
} from "../services/notification.service.js";
import { listNotificationsQuerySchema } from "../validators/notification.validator.js";

export async function listNotificationsController(req, res) {
  try {
    const parsed = listNotificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const notifications = await listNotifications(req.user.userId, parsed.data);

    return res.status(200).json({
      message: "Notifications retrieved successfully",
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getUnreadCountController(req, res) {
  try {
    const result = await getUnreadCount(req.user.userId);

    return res.status(200).json({
      message: "Unread count retrieved successfully",
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function markNotificationReadController(req, res) {
  try {
    const notification = await markNotificationRead(
      req.user.userId,
      req.params.id
    );

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function markAllNotificationsReadController(req, res) {
  try {
    const result = await markAllNotificationsRead(req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function processDeadlineRemindersController(req, res) {
  try {
    const result = await processDeadlineReminders();

    return res.status(200).json({
      message: "Deadline reminders processed",
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
