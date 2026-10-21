import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { authorize } from "../src/middleware/role.middleware.js";
import { validate } from "../src/middleware/validate.middleware.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../src/validators/user.validator.js";

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  notice: {
    count: jest.fn(),
  },
  notes: {
    count: jest.fn(),
  },
  subject: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockHashPassword = jest.fn();
const mockVerifyToken = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/utils/password.js", () => ({
  hashPassword: mockHashPassword,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

const {
  adminResetPassword,
  bulkCreateUsersFromCsv,
  createUserWithProfile,
  getUserById,
  listUsers,
  setUserActive,
  updateUser,
} = await import("../src/services/user.service.js");
const { getAdminOverview } = await import("../src/services/overview.service.js");
const {
  createUserController,
  listUsersController,
  deactivateUserController,
} = await import("../src/controllers/user.controller.js");
const { getAdminOverviewController } =
  await import("../src/controllers/overview.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: userRoutes } = await import("../src/routes/user.routes.js");

function mappedStudent(overrides = {}) {
  return {
    user_id: 10,
    name: "Ada Student",
    email: "ada@campusos.local",
    role: "STUDENT",
    isActive: true,
    lastLogin: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    student: {
      student_id: 1,
      roll_number: "CS001",
      full_name: "Ada Student",
      dept_id: 80,
      semester: 5,
      section: "A",
      admission_year: 2024,
      phone: null,
      department: { dept_id: 80, dept_name: "CSE", dept_code: "SEEDCS" },
    },
    faculty: null,
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

describe("User management + overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHashPassword.mockResolvedValue("hashed");
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe("validators", () => {
    test("createUserSchema requires student profile fields", () => {
      const result = createUserSchema.safeParse({
        name: "Ada",
        email: "ada@test.com",
        password: "CampusOS@123",
        role: "STUDENT",
      });
      expect(result.success).toBe(false);
    });

    test("createUserSchema accepts a valid student", () => {
      const result = createUserSchema.safeParse({
        name: "Ada",
        email: "ada@test.com",
        password: "CampusOS@123",
        role: "STUDENT",
        roll_number: "CS001",
        dept_id: 80,
        semester: 5,
        section: "A",
        admission_year: 2024,
      });
      expect(result.success).toBe(true);
    });

    test("listUsersQuerySchema coerces isActive", () => {
      const result = listUsersQuerySchema.safeParse({ isActive: "false", role: "STUDENT" });
      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(false);
    });

    test("updateUserSchema requires at least one field", () => {
      expect(updateUserSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("listUsers()", () => {
    test("filters by role and search", async () => {
      mockPrisma.user.findMany.mockResolvedValue([mappedStudent()]);

      const result = await listUsers({ role: "STUDENT", search: "ada" });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "STUDENT",
          OR: expect.any(Array),
        },
        include: expect.any(Object),
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      });
      expect(result[0].email).toBe("ada@campusos.local");
    });

    test("rejects invalid role", async () => {
      await expectStatus(listUsers({ role: "GUEST" }), 400);
    });
  });

  describe("createUserWithProfile()", () => {
    test("creates a student with profile", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mappedStudent());
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 80 });
      mockPrisma.student.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ user_id: 10 });
      mockPrisma.student.create.mockResolvedValue({ student_id: 1 });

      const result = await createUserWithProfile({
        name: "Ada",
        email: "ada@test.com",
        password: "CampusOS@123",
        role: "STUDENT",
        roll_number: "CS001",
        dept_id: 80,
        semester: 5,
        section: "A",
        admission_year: 2024,
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.student.create).toHaveBeenCalled();
      expect(result.role).toBe("STUDENT");
    });

    test("rejects duplicate email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1 });
      await expectStatus(
        createUserWithProfile({
          name: "Ada",
          email: "ada@test.com",
          password: "x",
          role: "STUDENT",
          dept_id: 80,
        }),
        409
      );
    });
  });

  describe("updateUser / activate / reset", () => {
    test("updates student name", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          user_id: 10,
          email: "ada@test.com",
          role: "STUDENT",
          student: { student_id: 1, roll_number: "CS001" },
          faculty: null,
        })
        .mockResolvedValueOnce(mappedStudent({ name: "Ada Lovelace" }));

      const result = await updateUser(10, { name: "Ada Lovelace" });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { user_id: 10 },
        data: { name: "Ada Lovelace" },
      });
      expect(result.name).toBe("Ada Lovelace");
    });

    test("refuses to deactivate an admin", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      await expectStatus(setUserActive(1, false), 403);
    });

    test("deactivates a student", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 10, role: "STUDENT" });
      mockPrisma.user.update.mockResolvedValue(mappedStudent({ isActive: false }));

      const result = await setUserActive(10, false);
      expect(result.isActive).toBe(false);
    });

    test("resets password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 10, role: "STUDENT" });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await adminResetPassword(10, "CampusOS@999");
      expect(mockHashPassword).toHaveBeenCalledWith("CampusOS@999");
      expect(result.message).toBe("Password reset successfully");
    });

    test("getUserById 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expectStatus(getUserById(99), 404);
    });
  });

  describe("bulkCreateUsersFromCsv()", () => {
    test("creates a valid student row", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mappedStudent());
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 80 });
      mockPrisma.student.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ user_id: 10 });
      mockPrisma.student.create.mockResolvedValue({ student_id: 1 });

      const csv =
        "role,name,email,password,dept_id,roll_number,semester,section,admission_year\n" +
        "STUDENT,CSV Student,csv@test.com,CampusOS@123,80,CSVSTU01,5,A,2024\n";

      const result = await bulkCreateUsersFromCsv(csv);
      expect(result.created_count).toBe(1);
      expect(result.failed_count).toBe(0);
    });

    test("rejects missing required columns", async () => {
      await expectStatus(bulkCreateUsersFromCsv("name,email\nAda,a@test.com\n"), 400);
    });
  });

  describe("getAdminOverview()", () => {
    test("returns grouped counts", async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1);
      mockPrisma.notice.count.mockResolvedValue(7);
      mockPrisma.notes.count.mockResolvedValue(3);
      mockPrisma.department.count.mockResolvedValue(2);
      mockPrisma.subject.count.mockResolvedValueOnce(9).mockResolvedValueOnce(8);

      const overview = await getAdminOverview();
      expect(overview.users).toEqual({
        total: 20,
        active: 18,
        inactive: 2,
        students: 15,
        faculty: 4,
        admins: 1,
      });
      expect(overview.notices.total).toBe(7);
      expect(overview.materials.total).toBe(3);
      expect(overview.subjects.active).toBe(8);
    });
  });

  describe("controllers + authz", () => {
    test("listUsersController returns 200", async () => {
      mockPrisma.user.findMany.mockResolvedValue([mappedStudent()]);
      const res = mockResponse();
      await listUsersController({ query: { role: "STUDENT" } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1 })
      );
    });

    test("createUserController returns 201", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mappedStudent());
      mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 80 });
      mockPrisma.student.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ user_id: 10 });
      mockPrisma.student.create.mockResolvedValue({ student_id: 1 });

      const res = mockResponse();
      await createUserController(
        {
          body: {
            name: "Ada",
            email: "ada@test.com",
            password: "CampusOS@123",
            role: "STUDENT",
            roll_number: "CS001",
            dept_id: 80,
            semester: 5,
            section: "A",
            admission_year: 2024,
          },
        },
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("deactivateUserController maps 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      const res = mockResponse();
      await deactivateUserController({ params: { id: "1" } }, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("getAdminOverviewController returns 200", async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.notice.count.mockResolvedValue(0);
      mockPrisma.notes.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);
      mockPrisma.subject.count.mockResolvedValue(0);

      const res = mockResponse();
      await getAdminOverviewController({}, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("authenticate rejects missing token", () => {
      const { next, res } = runMiddleware(authenticate, { headers: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("authorize blocks student from admin users", () => {
      const { next, res } = runMiddleware(authorize("ADMIN"), {
        user: { role: "STUDENT" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("validate rejects empty create body", () => {
      const { next, res } = runMiddleware(validate(createUserSchema), { body: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("user routes export a router", () => {
      expect(typeof userRoutes).toBe("function");
    });
  });
});
