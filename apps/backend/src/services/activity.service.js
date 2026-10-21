import prisma from "../config/db.js";

export const ACTIVITY_ACTIONS = Object.freeze({
  LOGIN: "LOGIN",
  PHOTO_UPLOAD: "PHOTO_UPLOAD",
  NOTES_DOWNLOAD: "NOTES_DOWNLOAD",
  NOTICE_ATTACHMENT_DOWNLOAD: "NOTICE_ATTACHMENT_DOWNLOAD",
  PREFERENCE_UPDATE: "PREFERENCE_UPDATE",
});

export async function logActivity(userId, action, detail = null) {
  try {
    if (!Number.isInteger(userId) || userId < 1 || !action) {
      return null;
    }

    return await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        detail: detail ? String(detail).slice(0, 300) : null,
      },
    });
  } catch (error) {
    console.error("Activity log failed:", error.message || error);
    return null;
  }
}

export async function listActivity(userId, query = {}) {
  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) {
    limit = 20;
  }
  if (limit > 50) {
    limit = 50;
  }

  const rows = await prisma.activityLog.findMany({
    where: { user_id: userId },
    orderBy: [{ created_at: "desc" }, { activity_id: "desc" }],
    take: limit,
    select: {
      activity_id: true,
      action: true,
      detail: true,
      created_at: true,
    },
  });

  return rows;
}
