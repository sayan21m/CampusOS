import prisma from "../config/db.js";
import {
  notifyNoticePublished,
  safeNotify,
} from "./notification.service.js";
import {
  resolveStoredPath,
  saveStoredFile,
} from "./file-storage.service.js";
import { logActivity, ACTIVITY_ACTIONS } from "./activity.service.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeNotice(notice, extras = {}) {
  return {
    notice_id: notice.notice_id,
    created_by: notice.created_by,
    title: notice.title,
    content: notice.content,
    category: notice.category,
    priority: notice.priority,
    target_type: notice.target_type,
    target_value: notice.target_value,
    attachment_url: notice.attachment_url ?? null,
    created_at: notice.created_at,
    has_attachment: Boolean(notice.attachment_url),
    ...extras,
  };
}

export async function createNotice(noticeData, user_id, file) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  let { title, content, category, priority, target_type, target_value } = noticeData;

  if (target_type === "all") {
    target_value = "ALL";
  } else if (target_type === "dept") {
    const departmentId = Number(target_value);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      throw createError("Invalid department id", 400);
    }

    const department = await prisma.department.findUnique({
      where: {
        dept_id: departmentId,
      },
    });

    if (!department) {
      throw createError("Department not found", 404);
    }

    if (user.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: {
          user_id,
        },
      });

      if (!faculty) {
        throw createError("Faculty profile not found", 404);
      }

      if (faculty.dept_id !== departmentId) {
        throw createError("You can only target your own department", 403);
      }
    }

    target_value = String(departmentId);
  } else if (target_type === "year") {
    const year = Number(target_value);

    if (!Number.isInteger(year) || year < 1 || year > 4) {
      throw createError("Invalid year", 400);
    }

    target_value = String(year);
  } else if (target_type === "section") {
    const parts = target_value.split(":");

    if (parts.length !== 2) {
      throw createError("Invalid section target format. Use departmentId:section", 400);
    }

    const dept_id_string = parts[0].trim();
    const section = parts[1].trim();
    const dept_id = Number(dept_id_string);

    if (!Number.isInteger(dept_id) || dept_id <= 0) {
      throw createError("Invalid department id", 400);
    }

    if (!section) {
      throw createError("Section cannot be empty", 400);
    }

    const dept = await prisma.department.findUnique({
      where: {
        dept_id,
      },
    });

    if (!dept) {
      throw createError("Department not found", 404);
    }

    if (user.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: {
          user_id,
        },
      });

      if (!faculty) {
        throw createError("Faculty profile not found", 404);
      }

      if (faculty.dept_id !== dept_id) {
        throw createError("You can only target your own department", 403);
      }
    }

    target_value = `${dept_id}:${section}`;
  }

  let notice = await prisma.notice.create({
    data: {
      created_by: user_id,
      title,
      content,
      category,
      priority,
      target_type,
      target_value,
    },
  });

  if (file?.buffer?.length) {
    try {
      const saved = await saveStoredFile({
        file,
        directory: `notices/notice-${notice.notice_id}`,
      });
      notice = await prisma.notice.update({
        where: { notice_id: notice.notice_id },
        data: { attachment_url: saved.path },
      });
    } catch (error) {
      await prisma.notice.delete({ where: { notice_id: notice.notice_id } }).catch(() => {});
      throw error.statusCode ? error : createError("Unable to store notice attachment", 500);
    }
  }

  await safeNotify(() => notifyNoticePublished(notice), "notice-published");

  return serializeNotice(notice);
}

function sortNotices(notices) {
  const priorityRank = {
    urgent: 0,
    important: 1,
    normal: 2,
  };

  return notices.sort((a, b) => {
    const priorityDifference = priorityRank[a.priority] - priorityRank[b.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

async function annotateNotices(notices, user_id, role) {
  if (!Array.isArray(notices) || notices.length === 0) {
    return notices;
  }

  const ids = notices.map((notice) => notice.notice_id);
  const reads = await prisma.noticeRead.findMany({
    where: {
      user_id,
      notice_id: { in: ids },
    },
    select: { notice_id: true },
  });
  const readSet = new Set(reads.map((row) => row.notice_id));

  let counts = new Map();
  if (role === "ADMIN" || role === "FACULTY") {
    const grouped = await prisma.noticeRead.groupBy({
      by: ["notice_id"],
      where: { notice_id: { in: ids } },
      _count: { notice_id: true },
    });
    counts = new Map(grouped.map((row) => [row.notice_id, row._count.notice_id]));
  }

  return notices.map((notice) =>
    serializeNotice(notice, {
      is_read: readSet.has(notice.notice_id),
      ...(role === "ADMIN" || role === "FACULTY"
        ? { read_count: counts.get(notice.notice_id) || 0 }
        : {}),
    })
  );
}

export async function getNotice(user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role === "ADMIN") {
    const notice = await prisma.notice.findMany();
    return annotateNotices(sortNotices(notice), user_id, user.role);
  } else if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    const notice = await prisma.notice.findMany({
      where: {
        OR: [
          {
            target_type: "all",
            target_value: "ALL",
          },
          {
            target_type: "dept",
            target_value: String(faculty.dept_id),
          },
        ],
      },
    });

    return annotateNotices(sortNotices(notice), user_id, user.role);
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id,
      },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (!Number.isInteger(student.semester) || student.semester < 1 || student.semester > 8) {
      throw createError("Invalid student semester", 400);
    }

    const year = Math.ceil(student.semester / 2);

    const notice = await prisma.notice.findMany({
      where: {
        OR: [
          {
            target_type: "all",
            target_value: "ALL",
          },
          {
            target_type: "dept",
            target_value: String(student.dept_id),
          },
          {
            target_type: "section",
            target_value: `${student.dept_id}:${student.section}`,
          },
          {
            target_type: "year",
            target_value: String(year),
          },
        ],
      },
    });

    return annotateNotices(sortNotices(notice), user_id, user.role);
  } else {
    throw createError("Unsupported user role", 403);
  }
}

function parseNoticeId(noticeId) {
  const notice_id = Number(noticeId);
  if (!Number.isInteger(notice_id) || notice_id < 1) {
    throw createError("Invalid notice id", 400);
  }
  return notice_id;
}

async function findVisibleNotice(user_id, noticeId) {
  const notice_id = parseNoticeId(noticeId);
  const notices = await getNotice(user_id);
  const notice = notices.find((row) => row.notice_id === notice_id);

  if (!notice) {
    throw createError("Notice not found", 404);
  }

  return notice;
}

export async function markNoticeRead(user_id, noticeId) {
  const notice = await findVisibleNotice(user_id, noticeId);

  await prisma.noticeRead.upsert({
    where: {
      notice_id_user_id: {
        notice_id: notice.notice_id,
        user_id,
      },
    },
    create: {
      notice_id: notice.notice_id,
      user_id,
    },
    update: {
      read_at: new Date(),
    },
  });

  return {
    notice_id: notice.notice_id,
    is_read: true,
  };
}

export async function getNoticeAttachment(user_id, noticeId) {
  const notice = await findVisibleNotice(user_id, noticeId);

  if (!notice.attachment_url) {
    throw createError("Notice has no attachment", 404);
  }

  const absolutePath = resolveStoredPath(notice.attachment_url);
  await logActivity(
    user_id,
    ACTIVITY_ACTIONS.NOTICE_ATTACHMENT_DOWNLOAD,
    notice.title
  );

  return { notice, absolutePath };
}
