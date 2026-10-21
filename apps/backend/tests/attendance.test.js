import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  ATTENDANCE_CORRECTION_DAYS,
  classRosterQuerySchema,
  markAttendanceSchema,
  updateAttendanceSchema,
} from "../src/validators/attendance.validator.js";
import { authorize } from "../src/middleware/role.middleware.js";
import { validate } from "../src/middleware/validate.middleware.js";

const mockPrisma = {
  faculty: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  subject: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  timetableSlot: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  timetableException: {
    findUnique: jest.fn(),
  },
  facultySubjectAllocation: {
    findUnique: jest.fn(),
  },
  attendance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

const mockVerifyToken = jest.fn();
const mockNotifyAttendanceShortage = jest.fn();
const mockSafeNotify = jest.fn(async (fn) => fn());

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../src/services/notification.service.js", () => ({
  notifyAttendanceShortage: mockNotifyAttendanceShortage,
  safeNotify: mockSafeNotify,
}));

const {
  formatSubjectReportCsv,
  getClassRoster,
  getMyAttendance,
  getSubjectReport,
  markAttendance,
  updateAttendance,
} = await import("../src/services/attendance.service.js");
const {
  getClassRosterController,
  getMyAttendanceController,
  markAttendanceController,
  updateAttendanceController,
} = await import("../src/controllers/attendance.controller.js");
const { authenticate } = await import("../src/middleware/auth.middleware.js");
const { default: attendanceRoutes } = await import("../src/routes/attendance.routes.js");

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

function slot(overrides = {}) {
  return {
    timetable_id: 9,
    subject_id: 162,
    faculty_id: 64,
    dept_id: 80,
    semester: 5,
    section: "A",
    period: 1,
    room: "C101",
    start_time: "09:00",
    end_time: "09:50",
    subject: {
      subject_id: 162,
      subject_code: "ADM101",
      subject_name: "Admin Test Subject",
      dept_id: 80,
      semester: 5,
      is_active: true,
    },
    ...overrides,
  };
}

function attendanceRow(overrides = {}) {
  const student = studentProfile();
  return {
    attendance_id: 3,
    student_id: student.student_id,
    subject_id: 162,
    faculty_id: 64,
    timetable_id: 9,
    class_date: new Date(Date.UTC(2026, 9, 21)),
    status: "PRESENT",
    marked_at: new Date("2026-10-21T09:00:00.000Z"),
    updated_at: new Date("2026-10-21T09:00:00.000Z"),
    student,
    subject: {
      subject_id: 162,
      subject_code: "ADM101",
      subject_name: "Admin Test Subject",
      dept_id: 80,
      semester: 5,
    },
    faculty: {
      faculty_id: 64,
      employee_id: "SEEDFAC01",
      full_name: "Seed Faculty One",
    },
    ...overrides,
  };
}

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
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

function todayUtcKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("Attendance tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSafeNotify.mockImplementation(async (fn) => fn());
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyProfile());
    mockPrisma.student.findUnique.mockResolvedValue(studentProfile());
    mockPrisma.student.findMany.mockResolvedValue([studentProfile()]);
    mockPrisma.subject.findUnique.mockResolvedValue({
      subject_id: 162,
      subject_code: "ADM101",
      subject_name: "Admin Test Subject",
      dept_id: 80,
      semester: 5,
    });
    mockPrisma.subject.findMany.mockResolvedValue([
      {
        subject_id: 162,
        subject_code: "ADM101",
        subject_name: "Admin Test Subject",
      },
    ]);
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(slot());
    mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 9 });
    mockPrisma.timetableException.findUnique.mockResolvedValue(null);
    mockPrisma.facultySubjectAllocation.findUnique.mockResolvedValue(null);
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.attendance.findUnique.mockResolvedValue(null);
  });

  describe("validators", () => {
    test("classRosterQuerySchema requires timetable_id and class_date", () => {
      expect(classRosterQuerySchema.safeParse({}).success).toBe(false);
      expect(
        classRosterQuerySchema.safeParse({
          timetable_id: 9,
          class_date: "2026-10-21",
        }).success
      ).toBe(true);
    });

    test("markAttendanceSchema requires records unless mark_all_present", () => {
      expect(
        markAttendanceSchema.safeParse({
          timetable_id: 9,
          class_date: "2026-10-21",
        }).success
      ).toBe(false);
      expect(
        markAttendanceSchema.safeParse({
          timetable_id: 9,
          class_date: "2026-10-21",
          mark_all_present: true,
        }).success
      ).toBe(true);
    });

    test("updateAttendanceSchema rejects invalid status", () => {
      expect(updateAttendanceSchema.safeParse({ status: "LATE" }).success).toBe(false);
      expect(updateAttendanceSchema.safeParse({ status: "ABSENT" }).success).toBe(true);
    });
  });

  describe("getClassRoster()", () => {
    test("returns section students with existing marks", async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([attendanceRow()]);

      const roster = await getClassRoster(20, {
        timetable_id: 9,
        class_date: "2026-10-21",
      });

      expect(roster.section).toBe("A");
      expect(roster.students[0].status).toBe("PRESENT");
      expect(roster.correction_days).toBe(ATTENDANCE_CORRECTION_DAYS);
    });

    test("rejects faculty who do not own the slot", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue(facultyProfile({ faculty_id: 99 }));
      await expectStatus(
        getClassRoster(20, { timetable_id: 9, class_date: "2026-10-21" }),
        403
      );
    });
  });

  describe("markAttendance()", () => {
    test("upserts present/absent records for the class", async () => {
      mockPrisma.attendance.upsert.mockResolvedValue(attendanceRow());

      const result = await markAttendance(20, {
        timetable_id: 9,
        class_date: todayUtcKey(),
        records: [{ student_id: 1, status: "PRESENT" }],
      });

      expect(mockPrisma.attendance.upsert).toHaveBeenCalledTimes(1);
      expect(result[0].status).toBe("PRESENT");
    });

    test("mark_all_present covers every student in the section", async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        studentProfile(),
        studentProfile({ student_id: 2, roll_number: "CS002" }),
      ]);
      mockPrisma.attendance.upsert.mockResolvedValue(attendanceRow());

      await markAttendance(20, {
        timetable_id: 9,
        class_date: todayUtcKey(),
        mark_all_present: true,
      });

      expect(mockPrisma.attendance.upsert).toHaveBeenCalledTimes(2);
    });

    test("rejects a future class date", async () => {
      await expectStatus(
        markAttendance(20, {
          timetable_id: 9,
          class_date: "2099-01-01",
          records: [{ student_id: 1, status: "PRESENT" }],
        }),
        400
      );
    });

    test("rejects a class older than the correction window", async () => {
      await expectStatus(
        markAttendance(20, {
          timetable_id: 9,
          class_date: "2020-01-01",
          records: [{ student_id: 1, status: "PRESENT" }],
        }),
        403
      );
    });

    test("rejects students outside the section", async () => {
      await expectStatus(
        markAttendance(20, {
          timetable_id: 9,
          class_date: todayUtcKey(),
          records: [{ student_id: 99, status: "ABSENT" }],
        }),
        400
      );
    });

    test("notifies when subject attendance falls below 75%", async () => {
      mockPrisma.attendance.upsert.mockResolvedValue(attendanceRow({ status: "ABSENT" }));
      mockPrisma.attendance.findMany.mockResolvedValue([
        { status: "ABSENT" },
        { status: "ABSENT" },
        { status: "ABSENT" },
        { status: "PRESENT" },
      ]);

      await markAttendance(20, {
        timetable_id: 9,
        class_date: todayUtcKey(),
        records: [{ student_id: 1, status: "ABSENT" }],
      });

      expect(mockNotifyAttendanceShortage).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 11,
          percentage: 25,
          classes_needed: 8,
        })
      );
    });
  });

  describe("updateAttendance()", () => {
    test("corrects a record inside the window", async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(
        attendanceRow({ class_date: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) })
      );
      mockPrisma.attendance.update.mockResolvedValue(attendanceRow({ status: "ABSENT" }));

      const updated = await updateAttendance(20, 3, { status: "ABSENT" });
      expect(updated.status).toBe("ABSENT");
    });

    test("rejects a missing record", async () => {
      await expectStatus(updateAttendance(20, 404, { status: "ABSENT" }), 404);
    });
  });

  describe("getMyAttendance()", () => {
    test("returns overall and subject percentages", async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        attendanceRow({ status: "PRESENT" }),
        attendanceRow({ attendance_id: 4, status: "ABSENT" }),
      ]);

      const summary = await getMyAttendance(11);
      expect(summary.overall.total).toBe(2);
      expect(summary.overall.percentage).toBe(50);
      expect(summary.overall.below_threshold).toBe(true);
      expect(summary.subjects[0].subject_code).toBe("ADM101");
      expect(summary.subjects[0].classes_needed).toBe(2);
      expect(summary.subjects[0].records).toHaveLength(2);
    });

    test("includes enrolled subjects even when no class has been marked", async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.subject.findMany.mockResolvedValue([
        { subject_id: 162, subject_code: "ADM101", subject_name: "Admin Test Subject" },
        { subject_id: 163, subject_code: "ADM102", subject_name: "Networks" },
      ]);

      const summary = await getMyAttendance(11);
      expect(summary.subjects).toHaveLength(2);
      expect(summary.subjects.map((row) => row.subject_code)).toEqual(["ADM101", "ADM102"]);
      expect(summary.subjects[1].total).toBe(0);
    });
  });

  describe("getSubjectReport()", () => {
    test("builds a faculty report and CSV", async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        { student_id: 1, status: "PRESENT", class_date: new Date() },
        { student_id: 1, status: "ABSENT", class_date: new Date() },
      ]);

      const report = await getSubjectReport(20, 162, {});
      expect(report.students[0].percentage).toBe(50);

      const csv = formatSubjectReportCsv(report);
      expect(csv).toContain("roll_number");
      expect(csv).toContain("CS001");
    });

    test("rejects faculty not allotted to the subject", async () => {
      mockPrisma.timetableSlot.findFirst.mockResolvedValue(null);
      mockPrisma.facultySubjectAllocation.findUnique.mockResolvedValue(null);
      await expectStatus(getSubjectReport(20, 162, {}), 403);
    });
  });

  describe("controllers", () => {
    test("markAttendanceController returns 201", async () => {
      mockPrisma.attendance.upsert.mockResolvedValue(attendanceRow());
      const res = mockResponse();

      await markAttendanceController(
        {
          user: { userId: 20 },
          body: {
            timetable_id: 9,
            class_date: todayUtcKey(),
            records: [{ student_id: 1, status: "PRESENT" }],
          },
        },
        res
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Attendance marked successfully" })
      );
    });

    test("getMyAttendanceController returns 200", async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      const res = mockResponse();
      await getMyAttendanceController({ user: { userId: 11 } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("getClassRosterController surfaces service errors", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue(null);
      const res = mockResponse();
      await getClassRosterController(
        { user: { userId: 20 }, validatedQuery: { timetable_id: 9, class_date: "2026-10-21" } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("updateAttendanceController returns updated record", async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(
        attendanceRow({
          class_date: new Date(
            Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
          ),
        })
      );
      mockPrisma.attendance.update.mockResolvedValue(attendanceRow({ status: "ABSENT" }));
      const res = mockResponse();
      await updateAttendanceController(
        { user: { userId: 20 }, params: { id: "3" }, body: { status: "ABSENT" } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("routes + authz", () => {
    test("students can read their own attendance", () => {
      expect(
        runMiddleware(authorize("STUDENT"), { user: { role: "STUDENT" } }).next
      ).toBe(true);
    });

    test("faculty cannot use the student summary route role", () => {
      const { next, res } = runMiddleware(authorize("STUDENT"), {
        user: { role: "FACULTY" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("mark payload is validated", () => {
      const { next, res } = runMiddleware(validate(markAttendanceSchema), {
        body: { timetable_id: 9, class_date: "bad" },
      });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("authenticate rejects a missing token", () => {
      const { next, res } = runMiddleware(authenticate, { headers: {} });
      expect(next).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("attendance routes expose class, me, subject, and mark paths", () => {
      const paths = attendanceRoutes.stack
        .filter((layer) => layer.route)
        .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toEqual(
        expect.arrayContaining([
          "GET /me",
          "GET /class",
          "GET /subject/:subjectId",
          "GET /subject/:subjectId/export",
          "POST /",
          "PATCH /:id",
        ])
      );
    });
  });
});
