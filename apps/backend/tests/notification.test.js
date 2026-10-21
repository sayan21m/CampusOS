import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { authorize } from "../src/middleware/role.middleware.js";

const mockPrisma = {
  user: {
    findMany: jest.fn(),
  },
  student: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  faculty: {
    findMany: jest.fn(),
  },
  subject: {
    findUnique: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  notificationPreference: {
    findMany: jest.fn(),
  },
};

const mockSendMail = jest.fn();
const mockVerifyToken = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/services/sendMail.service.js", () => ({
  sendMail: mockSendMail,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

const {
  createNotificationsForUsers,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyAssignmentGraded,
  notifyAssignmentPublished,
  notifyNoticePublished,
  notifyNotesUploaded,
  processDeadlineReminders,
} = await import("../src/services/notification.service.js");
const {
  getUnreadCountController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  processDeadlineRemindersController,
} = await import("../src/controllers/notification.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: notificationRoutes } =
  await import("../src/routes/notification.routes.js");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function runMiddleware(middleware, req, res = mockResponse()) {
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  middleware(req, res, next);
  return { next: nextCalled, res };
}

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("Notification module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
  });

  describe("createNotificationsForUsers()", () => {
    test("creates notifications with skipDuplicates", async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await createNotificationsForUsers({
        userIds: [1, 2, 2],
        title: "Hello",
        message: "World",
        type: "ASSIGNMENT_PUBLISHED",
        reference_id: 10,
      });

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ user_id: 1, type: "ASSIGNMENT_PUBLISHED" }),
          expect.objectContaining({ user_id: 2, type: "ASSIGNMENT_PUBLISHED" }),
        ],
        skipDuplicates: true,
      });
      expect(result.created_count).toBe(2);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test("returns zero when no user ids", async () => {
      const result = await createNotificationsForUsers({
        userIds: [],
        title: "x",
        message: "y",
        type: "NOTICE_PUBLISHED",
        reference_id: 1,
      });
      expect(result).toEqual({ created_count: 0, emailed_count: 0 });
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe("notifyAssignmentPublished()", () => {
    test("notifies students in the assignment section", async () => {
      mockPrisma.subject.findUnique.mockResolvedValue({
        dept_id: 1,
        semester: 5,
        subject_code: "CS501",
        subject_name: "DSA",
      });
      mockPrisma.student.findMany.mockResolvedValue([
        { user_id: 11, student_id: 1 },
        { user_id: 12, student_id: 2 },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await notifyAssignmentPublished({
        assignment_id: 99,
        subject_id: 7,
        title: "Lab 1",
        section: "A",
        deadline: new Date("2026-11-01T10:00:00.000Z"),
      });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith({
        where: { dept_id: 1, semester: 5, section: "A" },
        select: { user_id: true, student_id: true },
      });
      expect(result.created_count).toBe(2);
    });
  });

  describe("notifyAssignmentGraded()", () => {
    test("notifies the submitting student", async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ user_id: 44 });
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await notifyAssignmentGraded(
        { submission_id: 5, student_id: 3, marks: 18 },
        { title: "Lab 1", max_marks: 20 }
      );

      expect(result.created_count).toBe(1);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            user_id: 44,
            type: "ASSIGNMENT_GRADED",
            reference_id: 5,
          }),
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("notifyNoticePublished()", () => {
    test("emails recipients for urgent notices when mail is configured", async () => {
      process.env.RESEND_API_KEY = "test-key";
      process.env.MAIL_FROM = "CampusOS <noreply@campusos.local>";
      mockPrisma.user.findMany.mockResolvedValue([
        { user_id: 1, email: "a@test.com" },
        { user_id: 2, email: "b@test.com" },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockSendMail.mockResolvedValue({ id: "mail-1" });

      // first findMany for recipients (no email), second for email targets
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ user_id: 1 }, { user_id: 2 }])
        .mockResolvedValueOnce([
          { user_id: 1, email: "a@test.com" },
          { user_id: 2, email: "b@test.com" },
        ]);

      const result = await notifyNoticePublished({
        notice_id: 8,
        title: "Campus closed",
        content: "Due to weather",
        priority: "urgent",
        target_type: "all",
        target_value: "ALL",
      });

      expect(result.created_count).toBe(2);
      expect(mockSendMail).toHaveBeenCalled();
      expect(result.emailed_count).toBe(2);
    });

    test("skips email for users who opted out of notice mail", async () => {
      process.env.RESEND_API_KEY = "test-key";
      process.env.MAIL_FROM = "CampusOS <noreply@campusos.local>";
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ user_id: 1 }, { user_id: 2 }])
        .mockResolvedValueOnce([{ user_id: 2, email: "b@test.com" }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notificationPreference.findMany.mockResolvedValue([{ user_id: 1 }]);
      mockSendMail.mockResolvedValue({ id: "mail-1" });

      const result = await notifyNoticePublished({
        notice_id: 8,
        title: "Campus closed",
        content: "Due to weather",
        priority: "urgent",
        target_type: "all",
        target_value: "ALL",
      });

      expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: { in: [2] },
          }),
        })
      );
      expect(result.emailed_count).toBe(1);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe("notifyNotesUploaded()", () => {
    test("notifies students in subject dept/semester", async () => {
      mockPrisma.student.findMany.mockResolvedValue([{ user_id: 9 }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await notifyNotesUploaded(
        { notes_id: 3, title: "Unit 1 notes", unit_number: 1 },
        { dept_id: 1, semester: 5, subject_code: "CS501" }
      );

      expect(result.created_count).toBe(1);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: "NOTES_UPLOADED",
            reference_id: 3,
          }),
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("processDeadlineReminders()", () => {
    test("creates 48h reminders for students without submissions", async () => {
      const now = new Date("2026-10-20T12:00:00.000Z");
      mockPrisma.assignment.findMany.mockResolvedValueOnce([
        {
          assignment_id: 15,
          title: "Due soon",
          section: "A",
          deadline: new Date("2026-10-22T12:00:00.000Z"),
          subject: {
            dept_id: 1,
            semester: 5,
            subject_code: "CS501",
            subject_name: "DSA",
          },
          submissions: [{ student_id: 1 }],
        },
      ]);
      // 12h window empty
      mockPrisma.assignment.findMany.mockResolvedValueOnce([]);
      mockPrisma.student.findMany.mockResolvedValue([
        { user_id: 11, student_id: 1 },
        { user_id: 12, student_id: 2 },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await processDeadlineReminders(now);

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            user_id: 12,
            type: "ASSIGNMENT_DEADLINE_48H",
            reference_id: 15,
          }),
        ],
        skipDuplicates: true,
      });
      expect(result.created_count).toBe(1);
    });
  });

  describe("list / unread / mark read", () => {
    test("listNotifications filters unread_only", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          notification_id: 1,
          user_id: 10,
          title: "t",
          message: "m",
          type: "NOTICE_PUBLISHED",
          is_read: false,
          reference_id: 1,
          email_sent: false,
          created_at: new Date(),
        },
      ]);

      const result = await listNotifications(10, { unread_only: "true", limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { user_id: 10, is_read: false },
        orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
        take: 10,
      });
      expect(result).toHaveLength(1);
    });

    test("getUnreadCount returns count", async () => {
      mockPrisma.notification.count.mockResolvedValue(3);
      await expect(getUnreadCount(10)).resolves.toEqual({ unread_count: 3 });
    });

    test("markNotificationRead updates own notification", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        notification_id: 1,
        user_id: 10,
        title: "t",
        message: "m",
        type: "NOTICE_PUBLISHED",
        is_read: false,
        reference_id: 1,
        email_sent: false,
        created_at: new Date(),
      });
      mockPrisma.notification.update.mockResolvedValue({
        notification_id: 1,
        user_id: 10,
        title: "t",
        message: "m",
        type: "NOTICE_PUBLISHED",
        is_read: true,
        reference_id: 1,
        email_sent: false,
        created_at: new Date(),
      });

      const result = await markNotificationRead(10, 1);
      expect(result.is_read).toBe(true);
    });

    test("markNotificationRead rejects other user's notification", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        notification_id: 1,
        user_id: 99,
        is_read: false,
      });
      await expectStatus(markNotificationRead(10, 1), 404);
    });

    test("markAllNotificationsRead updates unread rows", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 });
      const result = await markAllNotificationsRead(10);
      expect(result.updated_count).toBe(4);
    });
  });

  describe("controllers + authz", () => {
    test("listNotificationsController returns 200", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const res = mockResponse();
      await listNotificationsController(
        { user: { userId: 1 }, query: {} },
        res
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("getUnreadCountController returns unread_count", async () => {
      mockPrisma.notification.count.mockResolvedValue(2);
      const res = mockResponse();
      await getUnreadCountController({ user: { userId: 1 } }, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ unread_count: 2 })
      );
    });

    test("markNotificationReadController maps 404", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      const res = mockResponse();
      await markNotificationReadController(
        { user: { userId: 1 }, params: { id: "9" } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("markAllNotificationsReadController returns payload", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      const res = mockResponse();
      await markAllNotificationsReadController({ user: { userId: 1 } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("processDeadlineRemindersController returns 200", async () => {
      mockPrisma.assignment.findMany.mockResolvedValue([]);
      const res = mockResponse();
      await processDeadlineRemindersController({ user: { userId: 1 } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Deadline reminders processed",
        })
      );
    });

    test("authenticate rejects missing token", () => {
      const { next, res } = runMiddleware(authenticate, { headers: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("authorize allows student for list", () => {
      const { next } = runMiddleware(authorize("ADMIN", "FACULTY", "STUDENT"), {
        user: { role: "STUDENT" },
      });
      expect(next).toBe(true);
    });

    test("authorize blocks student from deadline processor", () => {
      const { next, res } = runMiddleware(authorize("ADMIN"), {
        user: { role: "STUDENT" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("notification routes export a router", () => {
      expect(typeof notificationRoutes).toBe("function");
    });
  });
});
