import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { searchQuerySchema } from "../src/validators/search.validator.js";
import { authorize } from "../src/middleware/role.middleware.js";
import { validate } from "../src/middleware/validate.middleware.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  notice: {
    findMany: jest.fn(),
  },
  notes: {
    findMany: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
  },
  subject: {
    findMany: jest.fn(),
  },
  academicCalendar: {
    findMany: jest.fn(),
  },
  timetableSlot: {
    findMany: jest.fn(),
  },
  facultySubjectAllocation: {
    findMany: jest.fn(),
  },
  searchHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockVerifyToken = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

const { listRecentSearches, searchCampus } = await import("../src/services/search.service.js");
const {
  listRecentSearchesController,
  searchCampusController,
} = await import("../src/controllers/search.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: searchRoutes } = await import("../src/routes/search.routes.js");

function studentProfile(overrides = {}) {
  return {
    student_id: 1,
    user_id: 11,
    roll_number: "CS001",
    full_name: "Ada Student",
    dept_id: 80,
    semester: 5,
    section: "A",
    ...overrides,
  };
}

function facultyProfile(overrides = {}) {
  return {
    faculty_id: 64,
    user_id: 20,
    employee_id: "SEEDFAC01",
    full_name: "Seed Faculty One",
    dept_id: 80,
    ...overrides,
  };
}

function actorUser(role, overrides = {}) {
  return {
    user_id: role === "STUDENT" ? 11 : role === "FACULTY" ? 20 : 1,
    role,
    isActive: true,
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
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { next: nextCalled, res };
}

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("Search API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(actorUser("STUDENT"));
    mockPrisma.student.findUnique.mockResolvedValue(studentProfile());
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyProfile());
    mockPrisma.notice.findMany.mockResolvedValue([]);
    mockPrisma.notes.findMany.mockResolvedValue([]);
    mockPrisma.assignment.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.subject.findMany.mockResolvedValue([]);
    mockPrisma.academicCalendar.findMany.mockResolvedValue([]);
    mockPrisma.timetableSlot.findMany.mockResolvedValue([]);
    mockPrisma.facultySubjectAllocation.findMany.mockResolvedValue([]);
    mockPrisma.searchHistory.findMany.mockResolvedValue([]);
    mockPrisma.searchHistory.create.mockResolvedValue({ search_id: 1, query: "midterm" });
    mockPrisma.searchHistory.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe("searchQuerySchema", () => {
    test("requires a query string", () => {
      const parsed = searchQuerySchema.safeParse({});
      expect(parsed.success).toBe(false);
    });

    test("rejects an invalid type", () => {
      const parsed = searchQuerySchema.safeParse({ q: "lab", type: "TIMETABLE" });
      expect(parsed.success).toBe(false);
    });

    test("rejects to before from", () => {
      const parsed = searchQuerySchema.safeParse({
        q: "lab",
        from: "2026-10-21",
        to: "2026-10-20",
      });
      expect(parsed.success).toBe(false);
    });

    test("accepts a typed campus search", () => {
      const parsed = searchQuerySchema.safeParse({
        q: "midterm",
        type: "ASSIGNMENT",
        subject_id: "162",
        from: "2026-10-01",
        to: "2026-10-31",
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data.subject_id).toBe(162);
    });
  });

  describe("searchCampus()", () => {
    test("students search notices they are allowed to see", async () => {
      mockPrisma.notice.findMany.mockResolvedValue([
        {
          notice_id: 4,
          title: "Midterm schedule",
          content: "CS midterm starts Monday",
          category: "exam",
          created_at: new Date("2026-10-21T00:00:00.000Z"),
        },
      ]);

      const payload = await searchCampus(11, { q: "midterm" });

      expect(payload.count).toBe(1);
      expect(payload.results.NOTICE[0]).toMatchObject({
        type: "NOTICE",
        id: 4,
        title: "Midterm schedule",
        href: "/notices",
      });
      expect(mockPrisma.notice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { target_type: "all", target_value: "ALL" },
                  { target_type: "dept", target_value: "80" },
                  { target_type: "section", target_value: "80:A" },
                  { target_type: "year", target_value: "3" },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    test("students never receive user hits", async () => {
      await searchCampus(11, { q: "ada", type: "USER" });
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    test("students only see assignments for their section", async () => {
      mockPrisma.assignment.findMany.mockResolvedValue([
        {
          assignment_id: 9,
          subject_id: 162,
          title: "Lab report",
          deadline: new Date("2026-10-24T00:00:00.000Z"),
          subject: { subject_code: "ADM101", subject_name: "Admin Test Subject" },
        },
      ]);

      const payload = await searchCampus(11, { q: "lab", type: "ASSIGNMENT" });
      expect(payload.results.ASSIGNMENT[0].id).toBe(9);
      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [{ section: "A" }, { section: "ALL" }],
              }),
            ]),
          }),
        })
      );
    });

    test("faculty search users only inside their department", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(actorUser("FACULTY"));
      mockPrisma.user.findMany.mockResolvedValue([
        { user_id: 11, name: "Ada Student", email: "ada@campusos.local", role: "STUDENT" },
      ]);

      const payload = await searchCampus(20, { q: "ada", type: "USER" });

      expect(payload.results.USER[0].title).toBe("Ada Student");
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { student: { dept_id: 80 } },
                  { faculty: { dept_id: 80 } },
                ],
              }),
            ]),
          }),
        })
      );
    });

    test("admins can search users campus-wide", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(actorUser("ADMIN"));
      mockPrisma.user.findMany.mockResolvedValue([
        { user_id: 20, name: "Seed Faculty", email: "faculty@campusos.local", role: "FACULTY" },
      ]);

      const payload = await searchCampus(1, { q: "faculty", type: "USER" });
      expect(payload.results.USER).toHaveLength(1);
      expect(mockPrisma.user.findMany.mock.calls[0][0].where.AND).toHaveLength(1);
    });

    test("records a recent search after a successful query", async () => {
      await searchCampus(11, { q: "midterm" });

      expect(mockPrisma.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 11, query: "midterm" },
      });
      expect(mockPrisma.searchHistory.create).toHaveBeenCalledWith({
        data: { user_id: 11, query: "midterm" },
      });
    });

    test("type filter skips other collections", async () => {
      await searchCampus(11, { q: "os", type: "SUBJECT" });

      expect(mockPrisma.subject.findMany).toHaveBeenCalled();
      expect(mockPrisma.notice.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.notes.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.assignment.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.academicCalendar.findMany).not.toHaveBeenCalled();
    });

    test("rejects an inactive account", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(actorUser("STUDENT", { isActive: false }));
      await expectStatus(searchCampus(11, { q: "lab" }), 403);
    });
  });

  describe("listRecentSearches()", () => {
    test("returns the caller's recent queries", async () => {
      mockPrisma.searchHistory.findMany.mockResolvedValue([
        { search_id: 2, query: "midterm", created_at: new Date("2026-10-21T10:00:00.000Z") },
      ]);

      const recent = await listRecentSearches(11);
      expect(recent[0].query).toBe("midterm");
      expect(mockPrisma.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 11 },
          take: 10,
        })
      );
    });
  });

  describe("controllers", () => {
    test("searchCampusController returns grouped results", async () => {
      const res = mockResponse();
      await searchCampusController(
        { user: { userId: 11 }, validatedQuery: { q: "lab" } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Search completed successfully",
          query: "lab",
        })
      );
    });

    test("searchCampusController validates query when middleware did not", async () => {
      const res = mockResponse();
      await searchCampusController({ user: { userId: 11 }, query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("listRecentSearchesController returns 200", async () => {
      const res = mockResponse();
      await listRecentSearchesController({ user: { userId: 11 } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("searchCampusController surfaces service errors", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = mockResponse();
      await searchCampusController(
        { user: { userId: 11 }, validatedQuery: { q: "lab" } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("routes + authz", () => {
    test("all campus roles can search", () => {
      expect(runMiddleware(authorize("ADMIN", "FACULTY", "STUDENT"), { user: { role: "STUDENT" } }).next).toBe(true);
      expect(runMiddleware(authorize("ADMIN", "FACULTY", "STUDENT"), { user: { role: "FACULTY" } }).next).toBe(true);
      expect(runMiddleware(authorize("ADMIN", "FACULTY", "STUDENT"), { user: { role: "ADMIN" } }).next).toBe(true);
    });

    test("search query is validated", () => {
      const { next, res } = runMiddleware(validate(searchQuerySchema, "query"), {
        query: { q: "" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("authenticate rejects a missing token", () => {
      const { next, res } = runMiddleware(authenticate, { headers: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("search routes expose query and recent paths", () => {
      const paths = searchRoutes.stack
        .filter((layer) => layer.route)
        .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toEqual(expect.arrayContaining(["GET /", "GET /recent"]));
    });
  });
});
