import prisma from "../config/db.js";
import { sendMail } from "./sendMail.service.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeNotification(notification) {
  return {
    notification_id: notification.notification_id,
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    is_read: notification.is_read,
    reference_id: notification.reference_id,
    email_sent: notification.email_sent,
    created_at: notification.created_at,
  };
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createError(`Invalid ${fieldName}`, 400);
  }
  return parsed;
}

async function safeSendMail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !to) {
    return false;
  }

  try {
    await sendMail({ to, subject, html });
    return true;
  } catch (error) {
    console.error("Notification email failed:", error.message || error);
    return false;
  }
}

/**
 * Create notifications for many users. Idempotent via unique (user_id, type, reference_id).
 * Optionally emails each recipient when sendEmail is true.
 */
export async function createNotificationsForUsers({
  userIds,
  title,
  message,
  type,
  reference_id,
  sendEmail = false,
  emailSubject,
  emailHtml,
}) {
  const uniqueUserIds = [...new Set((userIds || []).filter((id) => Number.isInteger(id) && id > 0))];

  if (uniqueUserIds.length === 0) {
    return { created_count: 0, emailed_count: 0 };
  }

  const rows = uniqueUserIds.map((user_id) => ({
    user_id,
    title,
    message,
    type,
    reference_id: reference_id ?? null,
  }));

  const created = await prisma.notification.createMany({
    data: rows,
    skipDuplicates: true,
  });

  let emailed_count = 0;

  if (sendEmail) {
    const users = await prisma.user.findMany({
      where: {
        user_id: { in: uniqueUserIds },
        isActive: true,
      },
      select: { user_id: true, email: true },
    });

    for (const user of users) {
      const sent = await safeSendMail({
        to: user.email,
        subject: emailSubject || title,
        html: emailHtml || `<p>${message}</p>`,
      });

      if (sent) {
        emailed_count += 1;
        await prisma.notification.updateMany({
          where: {
            user_id: user.user_id,
            type,
            reference_id: reference_id ?? null,
          },
          data: { email_sent: true },
        });
      }
    }
  }

  return {
    created_count: created.count,
    emailed_count,
  };
}

async function getStudentUserIdsForAssignment(assignment) {
  const subject = await prisma.subject.findUnique({
    where: { subject_id: assignment.subject_id },
    select: { dept_id: true, semester: true, subject_code: true, subject_name: true },
  });

  if (!subject) {
    return { userIds: [], subject: null };
  }

  const where = {
    dept_id: subject.dept_id,
    semester: subject.semester,
  };

  if (assignment.section && assignment.section !== "ALL") {
    where.section = assignment.section;
  }

  const students = await prisma.student.findMany({
    where,
    select: { user_id: true, student_id: true },
  });

  return { userIds: students.map((s) => s.user_id), students, subject };
}

export async function notifyAssignmentPublished(assignment) {
  const { userIds, subject } = await getStudentUserIdsForAssignment(assignment);
  const subjectLabel = subject
    ? `${subject.subject_code} — ${subject.subject_name}`
    : "your subject";

  return createNotificationsForUsers({
    userIds,
    title: "New assignment posted",
    message: `"${assignment.title}" was posted for ${subjectLabel} (section ${assignment.section}). Deadline: ${new Date(assignment.deadline).toISOString()}.`,
    type: "ASSIGNMENT_PUBLISHED",
    reference_id: assignment.assignment_id,
  });
}

export async function notifyAssignmentGraded(submission, assignment) {
  const student = await prisma.student.findUnique({
    where: { student_id: submission.student_id },
    select: { user_id: true },
  });

  if (!student) {
    return { created_count: 0, emailed_count: 0 };
  }

  const marksText =
    submission.marks === null || submission.marks === undefined
      ? "graded"
      : `graded: ${submission.marks}/${assignment.max_marks}`;

  return createNotificationsForUsers({
    userIds: [student.user_id],
    title: "Assignment graded",
    message: `"${assignment.title}" has been ${marksText}.`,
    type: "ASSIGNMENT_GRADED",
    reference_id: submission.submission_id,
  });
}

async function resolveNoticeRecipientUserIds(notice) {
  const { target_type, target_value } = notice;

  if (target_type === "all") {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["STUDENT", "FACULTY"] } },
      select: { user_id: true },
    });
    return users.map((u) => u.user_id);
  }

  if (target_type === "dept") {
    const dept_id = Number(target_value);
    const [students, faculty] = await Promise.all([
      prisma.student.findMany({
        where: { dept_id },
        select: { user_id: true },
      }),
      prisma.faculty.findMany({
        where: { dept_id },
        select: { user_id: true },
      }),
    ]);
    return [...students, ...faculty].map((row) => row.user_id);
  }

  if (target_type === "year") {
    const year = Number(target_value);
    const minSemester = year * 2 - 1;
    const maxSemester = year * 2;
    const students = await prisma.student.findMany({
      where: {
        semester: { gte: minSemester, lte: maxSemester },
      },
      select: { user_id: true },
    });
    return students.map((s) => s.user_id);
  }

  if (target_type === "section") {
    const [deptPart, section] = String(target_value).split(":");
    const dept_id = Number(deptPart);
    const students = await prisma.student.findMany({
      where: { dept_id, section },
      select: { user_id: true },
    });
    return students.map((s) => s.user_id);
  }

  return [];
}

export async function notifyNoticePublished(notice) {
  const userIds = await resolveNoticeRecipientUserIds(notice);
  const isUrgent = String(notice.priority).toLowerCase() === "urgent";

  return createNotificationsForUsers({
    userIds,
    title: isUrgent ? "Urgent notice" : "New notice published",
    message: notice.title,
    type: "NOTICE_PUBLISHED",
    reference_id: notice.notice_id,
    sendEmail: isUrgent,
    emailSubject: `[CampusOS] Urgent: ${notice.title}`,
    emailHtml: `<p><strong>${notice.title}</strong></p><p>${notice.content || ""}</p>`,
  });
}

export async function notifyNotesUploaded(notes, subject) {
  const students = await prisma.student.findMany({
    where: {
      dept_id: subject.dept_id,
      semester: subject.semester,
    },
    select: { user_id: true },
  });

  return createNotificationsForUsers({
    userIds: students.map((s) => s.user_id),
    title: "New study material uploaded",
    message: `"${notes.title}" was uploaded for ${subject.subject_code} (unit ${notes.unit_number}).`,
    type: "NOTES_UPLOADED",
    reference_id: notes.notes_id,
  });
}

/**
 * Process 48h and 12h assignment deadline reminders for students who have not submitted.
 * Safe to run repeatedly (unique constraint + skipDuplicates).
 */
export async function processDeadlineReminders(now = new Date()) {
  const hourMs = 60 * 60 * 1000;
  const windows = [
    {
      type: "ASSIGNMENT_DEADLINE_48H",
      centerMs: 48 * hourMs,
      label: "48 hours",
    },
    {
      type: "ASSIGNMENT_DEADLINE_12H",
      centerMs: 12 * hourMs,
      label: "12 hours",
    },
  ];

  let created_count = 0;
  let emailed_count = 0;

  for (const window of windows) {
    const from = new Date(now.getTime() + window.centerMs - hourMs);
    const to = new Date(now.getTime() + window.centerMs + hourMs);

    const assignments = await prisma.assignment.findMany({
      where: {
        deadline: { gte: from, lte: to },
      },
      include: {
        subject: {
          select: {
            dept_id: true,
            semester: true,
            subject_code: true,
            subject_name: true,
          },
        },
        submissions: {
          select: { student_id: true },
        },
      },
    });

    for (const assignment of assignments) {
      const submittedIds = new Set(
        assignment.submissions.map((row) => row.student_id)
      );

      const studentWhere = {
        dept_id: assignment.subject.dept_id,
        semester: assignment.subject.semester,
      };
      if (assignment.section && assignment.section !== "ALL") {
        studentWhere.section = assignment.section;
      }

      const students = await prisma.student.findMany({
        where: studentWhere,
        select: { user_id: true, student_id: true },
      });

      const pendingUserIds = students
        .filter((student) => !submittedIds.has(student.student_id))
        .map((student) => student.user_id);

      const result = await createNotificationsForUsers({
        userIds: pendingUserIds,
        title: `Assignment due in ${window.label}`,
        message: `"${assignment.title}" (${assignment.subject.subject_code}) is due at ${assignment.deadline.toISOString()}.`,
        type: window.type,
        reference_id: assignment.assignment_id,
        sendEmail: true,
        emailSubject: `[CampusOS] Reminder: ${assignment.title} due in ${window.label}`,
        emailHtml: `<p>Your assignment <strong>${assignment.title}</strong> for ${assignment.subject.subject_code} is due in about ${window.label}.</p><p>Deadline: ${assignment.deadline.toISOString()}</p>`,
      });

      created_count += result.created_count;
      emailed_count += result.emailed_count;
    }
  }

  return { created_count, emailed_count };
}

export async function listNotifications(userId, query = {}) {
  const unreadOnly =
    query.unread_only === true ||
    query.unread_only === "true" ||
    query.unread_only === "1";

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) {
    limit = 50;
  }
  if (limit > 100) {
    limit = 100;
  }

  const where = { user_id: userId };
  if (unreadOnly) {
    where.is_read = false;
  }
  if (query.type) {
    where.type = query.type;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
    take: limit,
  });

  return notifications.map(serializeNotification);
}

export async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: {
      user_id: userId,
      is_read: false,
    },
  });

  return { unread_count: count };
}

export async function markNotificationRead(userId, notificationId) {
  const notification_id = parsePositiveInt(notificationId, "notification id");

  const existing = await prisma.notification.findUnique({
    where: { notification_id },
  });

  if (!existing || existing.user_id !== userId) {
    throw createError("Notification not found", 404);
  }

  if (existing.is_read) {
    return serializeNotification(existing);
  }

  const updated = await prisma.notification.update({
    where: { notification_id },
    data: { is_read: true },
  });

  return serializeNotification(updated);
}

export async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      user_id: userId,
      is_read: false,
    },
    data: { is_read: true },
  });

  return {
    updated_count: result.count,
    message: "All notifications marked as read",
  };
}

/** Fire-and-forget wrapper so publishers never fail when notifications fail. */
export async function safeNotify(fn, label) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Notification hook failed (${label}):`, error.message || error);
    return null;
  }
}
