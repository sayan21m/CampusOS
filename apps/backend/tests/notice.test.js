import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import express from "express";
import { createNoticeSchema } from "../src/validators/notice.validator.js";
import { authorize } from "../src/middleware/role.middleware.js";
import { validate } from "../src/middleware/validate.middleware.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  notice: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockVerifyToken = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

const { createNotice, getNotice } = await import("../src/services/notice.service.js");
const { createNoticeController, getNoticeController } =
  await import("../src/controllers/notice.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: noticeRoutes } = await import("../src/routes/notice.routes.js");

function baseNoticeInput(overrides = {}) {
  return {
    title: "Exam Schedule",
    content: "Mid-semester exams begin next week.",
    category: "exam",
    priority: "important",
    target_type: "all",
    target_value: "campus",
    ...overrides,
  };
}

function createdNotice(overrides = {}) {
  return {
    notice_id: 1,
    created_by: 10,
    title: "Exam Schedule",
    content: "Mid-semester exams begin next week.",
    category: "exam",
    priority: "important",
    target_type: "all",
    target_value: "ALL",
    attachment_url: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function runMiddleware(middleware, req, res = mockResponse()) {
  let nextCalled = false;
  let nextError;

  const next = (error) => {
    nextCalled = true;
    nextError = error;
  };

  middleware(req, res, next);

  return {
    next: nextCalled,
    error: nextError,
    res,
  };
}

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("Notice module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createNotice()", () => {
    test("admin creates an all notice and stores target_value as ALL", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({ created_by: 1, target_type: "all", target_value: "ALL" })
      );

      const result = await createNotice(baseNoticeInput({ target_value: "everyone" }), 1);

      expect(mockPrisma.notice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          created_by: 1,
          target_type: "all",
          target_value: "ALL",
        }),
      });
      expect(result).toEqual(
        expect.objectContaining({
          notice_id: 1,
          created_by: 1,
          target_type: "all",
          target_value: "ALL",
        })
      );
    });

    test("faculty creates an all notice", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({ created_by: 2, target_type: "all", target_value: "ALL" })
      );

      const result = await createNotice(baseNoticeInput(), 2);

      expect(mockPrisma.faculty.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.notice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          created_by: 2,
          target_type: "all",
          target_value: "ALL",
        }),
      });
      expect(result.target_value).toBe("ALL");
    });

    test("admin creates a department notice for an existing department", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 3, dept_name: "CSE" });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({
          created_by: 1,
          target_type: "dept",
          target_value: "3",
        })
      );

      const result = await createNotice(
        baseNoticeInput({ target_type: "dept", target_value: "3" }),
        1
      );

      expect(mockPrisma.notice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          target_type: "dept",
          target_value: "3",
        }),
      });
      expect(result.target_value).toBe("3");
    });

    test("faculty creates a department notice for their own department", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 5 });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 5 });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({
          created_by: 2,
          target_type: "dept",
          target_value: "5",
        })
      );

      const result = await createNotice(
        baseNoticeInput({ target_type: "dept", target_value: "05" }),
        2
      );

      expect(result.target_value).toBe("5");
      expect(mockPrisma.notice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ target_value: "5" }),
      });
    });

    test("admin creates year notices for years 1 through 4", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });

      for (const year of [1, 2, 3, 4]) {
        mockPrisma.notice.create.mockResolvedValueOnce(
          createdNotice({
            created_by: 1,
            target_type: "year",
            target_value: String(year),
          })
        );

        const result = await createNotice(
          baseNoticeInput({ target_type: "year", target_value: String(year) }),
          1
        );

        expect(result.target_type).toBe("year");
        expect(result.target_value).toBe(String(year));
        expect(mockPrisma.notice.create).toHaveBeenLastCalledWith({
          data: expect.objectContaining({
            target_type: "year",
            target_value: String(year),
          }),
        });
      }
    });

    test("admin creates a section notice and normalizes target_value", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 3 });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({
          created_by: 1,
          target_type: "section",
          target_value: "3:A",
        })
      );

      const result = await createNotice(
        baseNoticeInput({ target_type: "section", target_value: " 3 : A " }),
        1
      );

      expect(mockPrisma.notice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          target_type: "section",
          target_value: "3:A",
        }),
      });
      expect(result).toEqual(
        expect.objectContaining({
          notice_id: 1,
          created_by: 1,
          title: "Exam Schedule",
          content: "Mid-semester exams begin next week.",
          category: "exam",
          priority: "important",
          target_type: "section",
          target_value: "3:A",
        })
      );
    });

    test("faculty section notice normalizes target_value for own department", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 3 });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({
          created_by: 2,
          target_type: "section",
          target_value: "3:B",
        })
      );

      const result = await createNotice(
        baseNoticeInput({ target_type: "section", target_value: "3: B" }),
        2
      );

      expect(result.target_value).toBe("3:B");
    });

    test("nonexistent user returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expectStatus(createNotice(baseNoticeInput(), 99), 404);
      expect(mockPrisma.notice.create).not.toHaveBeenCalled();
    });

    test("invalid department id returns 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "0" }), 1),
        400
      );
      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "-2" }), 1),
        400
      );
      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "abc" }), 1),
        400
      );
    });

    test("nonexistent department returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "99" }), 1),
        404
      );
    });

    test("missing faculty profile returns 404 when required", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 3 });
      mockPrisma.faculty.findUnique.mockResolvedValue(null);

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "3" }), 2),
        404
      );
    });

    test("faculty targeting a different department returns 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 9 });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "dept", target_value: "9" }), 2),
        403
      );
    });

    test("invalid years return 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });

      for (const value of ["0", "5", "1.5", "freshman"]) {
        await expectStatus(
          createNotice(baseNoticeInput({ target_type: "year", target_value: value }), 1),
          400
        );
      }
    });

    test("malformed section formats are rejected", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });

      for (const value of ["3", "3:A:B", "0:A", "3:"]) {
        await expectStatus(
          createNotice(baseNoticeInput({ target_type: "section", target_value: value }), 1),
          400
        );
      }
    });

    test("nonexistent section-target department returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "section", target_value: "3:A" }), 1),
        404
      );
    });

    test("faculty targeting a section in another department returns 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 9 });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });

      await expectStatus(
        createNotice(baseNoticeInput({ target_type: "section", target_value: "9:A" }), 2),
        403
      );
    });
  });

  describe("getNotice()", () => {
    test("admin receives all notices including all target types", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      const notices = [
        createdNotice({
          notice_id: 1,
          target_type: "all",
          target_value: "ALL",
          priority: "normal",
        }),
        createdNotice({
          notice_id: 2,
          target_type: "dept",
          target_value: "3",
          priority: "normal",
        }),
        createdNotice({
          notice_id: 3,
          target_type: "year",
          target_value: "2",
          priority: "normal",
        }),
        createdNotice({
          notice_id: 4,
          target_type: "section",
          target_value: "3:A",
          priority: "normal",
        }),
      ];
      mockPrisma.notice.findMany.mockResolvedValue([...notices]);

      const result = await getNotice(1);

      expect(mockPrisma.notice.findMany).toHaveBeenCalledWith();
      expect(result).toHaveLength(4);
      expect(result.map((item) => item.target_type).sort()).toEqual([
        "all",
        "dept",
        "section",
        "year",
      ]);
    });

    test("admin results are ordered by priority then newest first", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.notice.findMany.mockResolvedValue([
        createdNotice({
          notice_id: 1,
          priority: "normal",
          created_at: new Date("2026-01-03T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 2,
          priority: "urgent",
          created_at: new Date("2026-01-01T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 3,
          priority: "important",
          created_at: new Date("2026-01-02T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 4,
          priority: "urgent",
          created_at: new Date("2026-01-04T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 5,
          priority: "important",
          created_at: new Date("2026-01-05T00:00:00.000Z"),
        }),
      ]);

      const result = await getNotice(1);

      expect(result.map((item) => item.notice_id)).toEqual([4, 2, 5, 3, 1]);
    });

    test("faculty receives all notices and own department notices only", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });
      mockPrisma.notice.findMany.mockResolvedValue([
        createdNotice({ notice_id: 1, target_type: "all", target_value: "ALL" }),
        createdNotice({ notice_id: 2, target_type: "dept", target_value: "3" }),
      ]);

      const result = await getNotice(2);

      expect(mockPrisma.notice.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { target_type: "all", target_value: "ALL" },
            { target_type: "dept", target_value: "3" },
          ],
        },
      });
      expect(result.map((item) => item.notice_id)).toEqual([1, 2]);
    });

    test("faculty query excludes other departments and student-only year/section targets", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });
      mockPrisma.notice.findMany.mockResolvedValue([]);

      await getNotice(2);

      const where = mockPrisma.notice.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { target_type: "all", target_value: "ALL" },
        { target_type: "dept", target_value: "3" },
      ]);
      expect(where.OR.some((clause) => clause.target_type === "year")).toBe(false);
      expect(where.OR.some((clause) => clause.target_type === "section")).toBe(false);
      expect(where.OR.some((clause) => clause.target_value === "9")).toBe(false);
    });

    test("missing faculty profile returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue(null);

      await expectStatus(getNotice(2), 404);
    });

    test("student receives matching all/dept/year/section notices", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue({
        user_id: 3,
        dept_id: 3,
        section: "A",
        semester: 5,
      });
      mockPrisma.notice.findMany.mockResolvedValue([
        createdNotice({ notice_id: 1, target_type: "all", target_value: "ALL" }),
        createdNotice({ notice_id: 2, target_type: "dept", target_value: "3" }),
        createdNotice({ notice_id: 3, target_type: "year", target_value: "3" }),
        createdNotice({ notice_id: 4, target_type: "section", target_value: "3:A" }),
      ]);

      const result = await getNotice(3);

      expect(mockPrisma.notice.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { target_type: "all", target_value: "ALL" },
            { target_type: "dept", target_value: "3" },
            { target_type: "section", target_value: "3:A" },
            { target_type: "year", target_value: "3" },
          ],
        },
      });
      expect(result).toHaveLength(4);
    });

    test("student query excludes other department, section, and year targets", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue({
        user_id: 3,
        dept_id: 3,
        section: "A",
        semester: 4,
      });
      mockPrisma.notice.findMany.mockResolvedValue([]);

      await getNotice(3);

      const where = mockPrisma.notice.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { target_type: "all", target_value: "ALL" },
        { target_type: "dept", target_value: "3" },
        { target_type: "section", target_value: "3:A" },
        { target_type: "year", target_value: "2" },
      ]);
      expect(where.OR).not.toContainEqual({ target_type: "dept", target_value: "9" });
      expect(where.OR).not.toContainEqual({ target_type: "section", target_value: "3:B" });
      expect(where.OR).not.toContainEqual({ target_type: "year", target_value: "1" });
    });

    test("missing student profile returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expectStatus(getNotice(3), 404);
    });

    test("invalid student semesters return 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });

      for (const semester of [0, 9, 1.5]) {
        mockPrisma.student.findUnique.mockResolvedValue({
          user_id: 3,
          dept_id: 3,
          section: "A",
          semester,
        });

        await expectStatus(getNotice(3), 400);
        expect(mockPrisma.notice.findMany).not.toHaveBeenCalled();
        mockPrisma.notice.findMany.mockClear();
      }
    });

    test("derives academic year from student semester", async () => {
      const cases = [
        { semester: 1, year: "1" },
        { semester: 2, year: "1" },
        { semester: 3, year: "2" },
        { semester: 4, year: "2" },
        { semester: 5, year: "3" },
        { semester: 6, year: "3" },
        { semester: 7, year: "4" },
        { semester: 8, year: "4" },
      ];

      for (const { semester, year } of cases) {
        jest.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
        mockPrisma.student.findUnique.mockResolvedValue({
          user_id: 3,
          dept_id: 3,
          section: "A",
          semester,
        });
        mockPrisma.notice.findMany.mockResolvedValue([]);

        await getNotice(3);

        expect(mockPrisma.notice.findMany).toHaveBeenCalledWith({
          where: {
            OR: expect.arrayContaining([{ target_type: "year", target_value: year }]),
          },
        });
      }
    });

    test("unsupported role returns 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 4, role: "GUEST" });

      await expectStatus(getNotice(4), 403);
    });

    test("nonexistent user returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expectStatus(getNotice(99), 404);
    });

    test("equal-priority notices are ordered newest first", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      mockPrisma.notice.findMany.mockResolvedValue([
        createdNotice({
          notice_id: 1,
          priority: "normal",
          created_at: new Date("2026-01-01T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 2,
          priority: "normal",
          created_at: new Date("2026-01-03T00:00:00.000Z"),
        }),
        createdNotice({
          notice_id: 3,
          priority: "normal",
          created_at: new Date("2026-01-02T00:00:00.000Z"),
        }),
      ]);

      const result = await getNotice(1);

      expect(result.map((item) => item.notice_id)).toEqual([2, 3, 1]);
    });
  });

  describe("controllers", () => {
    test("createNoticeController returns 201 with created notice", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 10, role: "ADMIN" });
      mockPrisma.notice.create.mockResolvedValue(
        createdNotice({
          notice_id: 1,
          created_by: 10,
          title: "Holiday",
          content: "Campus closed",
          category: "holiday",
          priority: "normal",
          target_type: "all",
          target_value: "ALL",
        })
      );

      const req = {
        user: { userId: 10, role: "ADMIN" },
        body: {
          title: "Holiday",
          content: "Campus closed",
          category: "holiday",
          priority: "normal",
          target_type: "all",
          target_value: "ALL",
        },
      };
      const res = mockResponse();

      await createNoticeController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Notice created successfully",
        notice: expect.objectContaining({
          notice_id: 1,
          created_by: 10,
          target_value: "ALL",
        }),
      });
    });

    test("createNoticeController maps service errors to HTTP status", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 9 });
      mockPrisma.faculty.findUnique.mockResolvedValue({ user_id: 2, dept_id: 3 });

      const req = {
        user: { userId: 2, role: "FACULTY" },
        body: {
          title: "Dept note",
          content: "Content",
          category: "academic",
          priority: "normal",
          target_type: "dept",
          target_value: "9",
        },
      };
      const res = mockResponse();

      await createNoticeController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You can only target your own department",
      });
    });

    test("getNoticeController returns 200 with notice array", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue({
        user_id: 3,
        dept_id: 3,
        section: "A",
        semester: 5,
      });
      mockPrisma.notice.findMany.mockResolvedValue([
        createdNotice({
          notice_id: 1,
          created_by: 1,
          title: "Urgent",
          content: "Read now",
          category: "urgent",
          priority: "urgent",
          target_type: "all",
          target_value: "ALL",
        }),
      ]);

      const req = { user: { userId: 3, role: "STUDENT" } };
      const res = mockResponse();

      await getNoticeController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Notice created successfully",
        notice: [
          expect.objectContaining({
            notice_id: 1,
            target_type: "all",
            target_value: "ALL",
          }),
        ],
      });
    });

    test("getNoticeController maps missing profile to 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue(null);

      const req = { user: { userId: 3, role: "STUDENT" } };
      const res = mockResponse();

      await getNoticeController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Student profile not found",
      });
    });

    test("controllers default unknown errors to 500", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Unexpected failure"));

      const req = { user: { userId: 1, role: "ADMIN" } };
      const res = mockResponse();

      await getNoticeController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unexpected failure",
      });
    });
  });

  describe("route validation and authorization", () => {
    test("unauthenticated requests are rejected", () => {
      const req = { headers: {} };
      const res = mockResponse();

      runMiddleware(authenticate, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    });

    test("invalid bearer tokens are rejected", () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error("bad token");
      });

      const req = { headers: { authorization: "Bearer bad-token" } };
      const res = mockResponse();

      runMiddleware(authenticate, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
    });

    test("students cannot create notices", () => {
      const req = { user: { userId: 3, role: "STUDENT" } };
      const res = mockResponse();

      runMiddleware(authorize("ADMIN", "FACULTY"), req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
    });

    test("unauthenticated create requests are rejected by authorize", () => {
      const req = {};
      const res = mockResponse();

      runMiddleware(authorize("ADMIN", "FACULTY"), req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    });

    test("admin and faculty are authorized to create notices", () => {
      for (const role of ["ADMIN", "FACULTY"]) {
        const req = { user: { userId: 1, role } };
        const res = mockResponse();
        const outcome = runMiddleware(authorize("ADMIN", "FACULTY"), req, res);

        expect(outcome.next).toBe(true);
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    test("invalid POST payloads fail Zod validation with 400", () => {
      const req = {
        body: {
          title: "",
          content: "Missing other fields",
        },
      };
      const res = mockResponse();

      runMiddleware(validate(createNoticeSchema), req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed",
          errors: expect.any(Array),
        })
      );
    });

    test("valid POST payload passes validation and writes parsed body", () => {
      const req = {
        body: {
          title: "  Midterm Notice  ",
          content: "  Bring ID cards.  ",
          category: "exam",
          priority: "urgent",
          target_type: "year",
          target_value: " 2 ",
        },
      };
      const res = mockResponse();
      const outcome = runMiddleware(validate(createNoticeSchema), req, res);

      expect(outcome.next).toBe(true);
      expect(req.body).toEqual({
        title: "Midterm Notice",
        content: "Bring ID cards.",
        category: "exam",
        priority: "urgent",
        target_type: "year",
        target_value: "2",
      });
    });

    test("notice router exposes authenticated POST and GET handlers", () => {
      const layerMethods = noticeRoutes.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods).sort(),
        }));

      expect(layerMethods).toEqual(
        expect.arrayContaining([
          { path: "/", methods: ["post"] },
          { path: "/", methods: ["get"] },
        ])
      );

      const app = express();
      app.use("/api/v1/notices", noticeRoutes);
      expect(typeof app.use).toBe("function");
    });
  });
});
