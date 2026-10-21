import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  createCalendarEntrySchema,
  formatDateOnly,
  parseDateOnly,
  updateCalendarEntrySchema,
} from "../src/validators/calendar.validator.js";
import { authorize } from "../src/middleware/role.middleware.js";
import { validate } from "../src/middleware/validate.middleware.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  subject: {
    findMany: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
  },
  academicCalendar: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockVerifyToken = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

const {
  createCalendarEntry,
  deleteCalendarEntry,
  getCalendarEntryById,
  listCalendarEntries,
  updateCalendarEntry,
} = await import("../src/services/calendar.service.js");
const {
  createCalendarEntryController,
  deleteCalendarEntryController,
  getCalendarEntryController,
  listCalendarEntriesController,
  updateCalendarEntryController,
} = await import("../src/controllers/calendar.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: calendarRoutes } = await import("../src/routes/calendar.routes.js");

function baseEntryInput(overrides = {}) {
  return {
    title: "Diwali Break",
    description: "Campus closed for Diwali",
    entry_type: "HOLIDAY",
    start_date: "2026-11-09",
    end_date: "2026-11-12",
    academic_year: 2026,
    ...overrides,
  };
}

function createdEntry(overrides = {}) {
  return {
    calendar_id: 1,
    title: "Diwali Break",
    description: "Campus closed for Diwali",
    entry_type: "HOLIDAY",
    start_date: new Date(Date.UTC(2026, 10, 9)),
    end_date: new Date(Date.UTC(2026, 10, 12)),
    academic_year: 2026,
    created_by: 10,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
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

describe("Calendar module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validators", () => {
    test("parseDateOnly accepts valid dates and rejects invalid ones", () => {
      expect(formatDateOnly(parseDateOnly("2026-02-28"))).toBe("2026-02-28");
      expect(parseDateOnly("2026-02-30")).toBeNull();
      expect(parseDateOnly("0226-10-12")).toBeNull();
      expect(parseDateOnly("not-a-date")).toBeNull();
    });

    test("createCalendarEntrySchema accepts a valid holiday", () => {
      const result = createCalendarEntrySchema.safeParse(baseEntryInput());
      expect(result.success).toBe(true);
      expect(result.data.entry_type).toBe("HOLIDAY");
    });

    test("createCalendarEntrySchema rejects end_date before start_date", () => {
      const result = createCalendarEntrySchema.safeParse(
        baseEntryInput({ start_date: "2026-11-12", end_date: "2026-11-09" })
      );
      expect(result.success).toBe(false);
    });

    test("createCalendarEntrySchema rejects invalid entry_type", () => {
      const result = createCalendarEntrySchema.safeParse(
        baseEntryInput({ entry_type: "PARTY" })
      );
      expect(result.success).toBe(false);
    });

    test("updateCalendarEntrySchema requires at least one field", () => {
      const result = updateCalendarEntrySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createCalendarEntry()", () => {
    test("creates an entry for an admin user", async () => {
      mockPrisma.academicCalendar.create.mockResolvedValue(createdEntry());

      const result = await createCalendarEntry(baseEntryInput(), 10);

      expect(mockPrisma.academicCalendar.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Diwali Break",
          entry_type: "HOLIDAY",
          academic_year: 2026,
          created_by: 10,
          start_date: new Date(Date.UTC(2026, 10, 9)),
          end_date: new Date(Date.UTC(2026, 10, 12)),
        }),
      });
      expect(result).toEqual(
        expect.objectContaining({
          calendar_id: 1,
          start_date: "2026-11-09",
          end_date: "2026-11-12",
          source: "calendar",
        })
      );
    });
  });

  describe("listCalendarEntries()", () => {
    test("returns stored entries ordered by start_date", async () => {
      mockPrisma.academicCalendar.findMany.mockResolvedValue([
        createdEntry(),
        createdEntry({
          calendar_id: 2,
          title: "Mid Sem Exams",
          entry_type: "EXAMINATION",
          start_date: new Date(Date.UTC(2026, 9, 1)),
          end_date: new Date(Date.UTC(2026, 9, 10)),
        }),
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        isActive: true,
      });

      const result = await listCalendarEntries(10, { academic_year: "2026" });

      expect(mockPrisma.academicCalendar.findMany).toHaveBeenCalledWith({
        where: { academic_year: 2026 },
        orderBy: [{ start_date: "asc" }, { calendar_id: "asc" }],
      });
      expect(result).toHaveLength(2);
      expect(result[0].start_date).toBe("2026-10-01");
      expect(result[1].start_date).toBe("2026-11-09");
    });

    test("rejects invalid entry_type filter", async () => {
      await expectStatus(listCalendarEntries(10, { entry_type: "PARTY" }), 400);
    });

    test("merges assignment deadlines for students when include_deadlines is true", async () => {
      mockPrisma.academicCalendar.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "STUDENT",
        isActive: true,
      });
      mockPrisma.student.findUnique.mockResolvedValue({
        dept_id: 1,
        semester: 5,
        section: "A",
      });
      mockPrisma.subject.findMany.mockResolvedValue([{ subject_id: 7 }]);
      mockPrisma.assignment.findMany.mockResolvedValue([
        {
          assignment_id: 55,
          title: "DSA Lab Report",
          description: "Submit PDF",
          deadline: new Date(Date.UTC(2026, 10, 20, 14, 0, 0)),
          subject: {
            subject_code: "CS501",
            subject_name: "DSA",
          },
        },
      ]);

      const result = await listCalendarEntries(20, { include_deadlines: "true" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          title: "DSA Lab Report",
          entry_type: "ASSIGNMENT_DEADLINE",
          start_date: "2026-11-20",
          end_date: "2026-11-20",
          source: "assignment",
          reference_id: 55,
        })
      );
    });

    test("skips assignment deadlines when include_deadlines=false", async () => {
      mockPrisma.academicCalendar.findMany.mockResolvedValue([createdEntry()]);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "STUDENT",
        isActive: true,
      });

      const result = await listCalendarEntries(20, {
        include_deadlines: "false",
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.assignment.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getCalendarEntryById()", () => {
    test("returns a serialized entry", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());

      const result = await getCalendarEntryById(1);

      expect(result.calendar_id).toBe(1);
      expect(result.start_date).toBe("2026-11-09");
    });

    test("throws 404 when missing", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(null);
      await expectStatus(getCalendarEntryById(99), 404);
    });

    test("throws 400 for invalid id", async () => {
      await expectStatus(getCalendarEntryById("abc"), 400);
    });
  });

  describe("updateCalendarEntry()", () => {
    test("updates title and keeps existing dates", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());
      mockPrisma.academicCalendar.update.mockResolvedValue(
        createdEntry({ title: "Extended Diwali Break" })
      );

      const result = await updateCalendarEntry(1, {
        title: "Extended Diwali Break",
      });

      expect(mockPrisma.academicCalendar.update).toHaveBeenCalledWith({
        where: { calendar_id: 1 },
        data: { title: "Extended Diwali Break" },
      });
      expect(result.title).toBe("Extended Diwali Break");
    });

    test("rejects range when patched end_date is before existing start", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());
      await expectStatus(
        updateCalendarEntry(1, { end_date: "2026-11-01" }),
        400
      );
    });
  });

  describe("deleteCalendarEntry()", () => {
    test("deletes an existing entry", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());
      mockPrisma.academicCalendar.delete.mockResolvedValue(createdEntry());

      const result = await deleteCalendarEntry(1);

      expect(mockPrisma.academicCalendar.delete).toHaveBeenCalledWith({
        where: { calendar_id: 1 },
      });
      expect(result).toEqual({
        calendar_id: 1,
        message: "Calendar entry deleted successfully",
      });
    });
  });

  describe("controllers", () => {
    test("listCalendarEntriesController returns 200 payload", async () => {
      mockPrisma.academicCalendar.findMany.mockResolvedValue([createdEntry()]);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        isActive: true,
      });

      const req = { user: { userId: 10 }, query: {} };
      const res = mockResponse();

      await listCalendarEntriesController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Calendar entries retrieved successfully",
          count: 1,
        })
      );
    });

    test("createCalendarEntryController returns 201", async () => {
      mockPrisma.academicCalendar.create.mockResolvedValue(createdEntry());

      const req = { user: { userId: 10 }, body: baseEntryInput() };
      const res = mockResponse();

      await createCalendarEntryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Calendar entry created successfully",
        })
      );
    });

    test("getCalendarEntryController maps 404", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(null);

      const req = { params: { id: "99" } };
      const res = mockResponse();

      await getCalendarEntryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("updateCalendarEntryController returns updated entry", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());
      mockPrisma.academicCalendar.update.mockResolvedValue(
        createdEntry({ title: "Updated" })
      );

      const req = { params: { id: "1" }, body: { title: "Updated" } };
      const res = mockResponse();

      await updateCalendarEntryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Calendar entry updated successfully",
        })
      );
    });

    test("deleteCalendarEntryController returns delete payload", async () => {
      mockPrisma.academicCalendar.findUnique.mockResolvedValue(createdEntry());
      mockPrisma.academicCalendar.delete.mockResolvedValue(createdEntry());

      const req = { params: { id: "1" } };
      const res = mockResponse();

      await deleteCalendarEntryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 1,
          message: "Calendar entry deleted successfully",
        })
      );
    });
  });

  describe("authz middleware wiring", () => {
    test("authenticate rejects missing token", () => {
      const { res, next } = runMiddleware(authenticate, { headers: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("authorize allows ADMIN for create route middleware", () => {
      const { next, res } = runMiddleware(authorize("ADMIN"), {
        user: { role: "ADMIN" },
      });
      expect(next).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("authorize blocks STUDENT from admin-only create", () => {
      const { next, res } = runMiddleware(authorize("ADMIN"), {
        user: { role: "STUDENT" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("validate rejects invalid create body", () => {
      const { next, res } = runMiddleware(
        validate(createCalendarEntrySchema),
        { body: { title: "" } }
      );
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("calendar routes export a router", () => {
      expect(calendarRoutes).toBeTruthy();
      expect(typeof calendarRoutes).toBe("function");
    });
  });
});
