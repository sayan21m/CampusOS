import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  createTimetableSlotSchema,
  updateTimetableSlotSchema,
  validateMergedSlotTimes,
} from "../src/validators/timetable.validator.js";
import { validate } from "../src/middleware/validate.middleware.js";

const mockTx = {
  subject: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
  },
  timetableSlot: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  timetableException: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
  },
  subject: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  timetableSlot: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  timetableException: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

const {
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getTimetable,
  getTodayTimetable,
  getEffectiveTimetable,
  getKolkataDayOfWeek,
  changeRoomTimeTimetable,
  handleTimetableException,
  getTimetableExceptionById,
  listTimetableExceptions,
} = await import("../src/services/timetable.service.js");
const {
  TIMETABLE_SLOT_READ_INCLUDE,
  resolveOccurrenceOnDate,
  loadOccurrencesForDate,
  occurrenceConflictKind,
  timesOverlap,
  toDateKey,
  sameCalendarDate,
  getKolkataDateOnly,
  buildEffectiveOccurrence,
} = await import("../src/services/timetable-effective.js");
const { parseDateOnly } = await import("../src/validators/timetable.validator.js");
const {
  updateTimetableSlotController,
  deletedSlotController,
  getTimetableController,
  getTodayTimetableController,
  getEffectiveTimetableController,
  getTimetableExceptionController,
  listTimetableExceptionsController,
} = await import("../src/controllers/timetable.controller.js");

const SENSITIVE_FIELD_PATTERN = /passwordHash|password_hash|tokenHash|resetToken|jwt|secret/i;

const ADMIN_USER_ID = 1;

function adminUser(overrides = {}) {
  return { user_id: ADMIN_USER_ID, role: "ADMIN", ...overrides };
}

function baseSlotInput(overrides = {}) {
  return {
    subject_id: 10,
    faculty_id: 20,
    dept_id: 30,
    semester: 5,
    section: "A",
    day_of_week: 1,
    period: 2,
    room: "CSE-301",
    start_time: "10:00",
    end_time: "11:00",
    ...overrides,
  };
}

function subjectRecord(overrides = {}) {
  return {
    subject_id: 10,
    subject_code: "CS501",
    subject_name: "DBMS",
    dept_id: 30,
    semester: 5,
    ...overrides,
  };
}

function facultyRecord(overrides = {}) {
  return {
    faculty_id: 20,
    full_name: "Dr. Rao",
    dept_id: 30,
    ...overrides,
  };
}

function departmentRecord(overrides = {}) {
  return {
    dept_id: 30,
    dept_name: "Computer Science",
    dept_code: "CSE",
    ...overrides,
  };
}

function createdSlot(overrides = {}) {
  return {
    timetable_id: 100,
    subject_id: 10,
    faculty_id: 20,
    dept_id: 30,
    semester: 5,
    section: "A",
    day_of_week: 1,
    period: 2,
    room: "CSE-301",
    start_time: "10:00",
    end_time: "11:00",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

function mockRelatedEntitiesOk({
  subject = subjectRecord(),
  faculty = facultyRecord(),
  department = departmentRecord(),
} = {}) {
  mockPrisma.subject.findUnique.mockResolvedValue(subject);
  mockPrisma.faculty.findUnique.mockResolvedValue(faculty);
  mockPrisma.department.findUnique.mockResolvedValue(department);
}

/**
 * Default $transaction mock: runs the callback against mockTx and records options.
 * findFirst sequence defaults to no conflicts unless callers override mockTx.
 */
function mockTransactionSuccess() {
  mockPrisma.$transaction.mockImplementation(async (work, options) => {
    mockTransactionSuccess.lastOptions = options;
    return work(mockTx);
  });
}

function prismaUniqueError(target) {
  const error = new Error("Unique constraint failed");
  error.code = "P2002";
  error.meta = { target };
  return error;
}

function prismaSerializationError() {
  const error = new Error("Transaction failed due to a write conflict or a deadlock");
  error.code = "P2034";
  return error;
}

function prismaRecordNotFoundError() {
  const error = new Error("Record to delete does not exist");
  error.code = "P2025";
  return error;
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

  return { next: nextCalled, error: nextError, res };
}

function mockTxRelatedEntitiesOk({
  subject = subjectRecord(),
  faculty = facultyRecord(),
  department = departmentRecord(),
} = {}) {
  mockTx.subject.findUnique.mockResolvedValue(subject);
  mockTx.faculty.findUnique.mockResolvedValue(faculty);
  mockTx.department.findUnique.mockResolvedValue(department);
}

describe("Timetable service — createTimetableSlot()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionSuccess.lastOptions = undefined;
    mockTx.timetableSlot.findFirst.mockResolvedValue(null);
    mockTx.timetableSlot.create.mockResolvedValue(createdSlot());
    mockTransactionSuccess();
  });

  describe("A. Authorization and entity validation", () => {
    test("unknown user returns 404 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 404);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("STUDENT receives 403 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 403);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("FACULTY receives 403 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 403);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("ADMIN proceeds past authorization to entity checks", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput(), ADMIN_USER_ID);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: ADMIN_USER_ID },
        select: { user_id: true, role: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).toHaveBeenCalled();
    });

    test("missing subject returns 404 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.subject.findUnique.mockResolvedValue(null);
      mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord());
      mockPrisma.department.findUnique.mockResolvedValue(departmentRecord());

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 404);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("missing faculty returns 404 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.subject.findUnique.mockResolvedValue(subjectRecord());
      mockPrisma.faculty.findUnique.mockResolvedValue(null);
      mockPrisma.department.findUnique.mockResolvedValue(departmentRecord());

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 404);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("missing department returns 404 and does not create a slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.subject.findUnique.mockResolvedValue(subjectRecord());
      mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord());
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 404);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("subject belonging to another department returns 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk({ subject: subjectRecord({ dept_id: 99 }) });

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 400);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("subject belonging to another semester returns 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk({ subject: subjectRecord({ semester: 3 }) });

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 400);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("faculty belonging to another department returns 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk({ faculty: facultyRecord({ dept_id: 99 }) });

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 400);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });
  });

  describe("B. Section normalization", () => {
    test('normalizes " A " to "A" in conflict query and create data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput({ section: " A " }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst).toHaveBeenNthCalledWith(1, {
        where: expect.objectContaining({ section: "A" }),
      });
      expect(mockTx.timetableSlot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ section: "A" }),
      });
    });

    test("converts lowercase section names to uppercase", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput({ section: "b" }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst).toHaveBeenNthCalledWith(1, {
        where: expect.objectContaining({ section: "B" }),
      });
      expect(mockTx.timetableSlot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ section: "B" }),
      });
    });

    test("rejects empty or whitespace-only section with 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      for (const section of ["", "   ", "\t"]) {
        await expectStatus(createTimetableSlot(baseSlotInput({ section }), ADMIN_USER_ID), 400);
      }

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("rejects a non-string section with 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      for (const section of [null, 1, true, {}, []]) {
        await expectStatus(createTimetableSlot(baseSlotInput({ section }), ADMIN_USER_ID), 400);
      }

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
    });

    test("validator also uppercases and rejects invalid sections", () => {
      const ok = createTimetableSlotSchema.safeParse(baseSlotInput({ section: " a " }));
      expect(ok.success).toBe(true);
      expect(ok.data.section).toBe("A");

      const empty = createTimetableSlotSchema.safeParse(baseSlotInput({ section: "   " }));
      expect(empty.success).toBe(false);

      const badChars = createTimetableSlotSchema.safeParse(baseSlotInput({ section: "A;DROP" }));
      expect(badChars.success).toBe(false);
    });
  });

  describe("C. Group-period conflicts", () => {
    test("existing slot for same dept/semester/section/weekday/period returns 409", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockTx.timetableSlot.findFirst.mockResolvedValueOnce(createdSlot({ timetable_id: 50 }));

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 409);

      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          dept_id: 30,
          semester: 5,
          section: "A",
          day_of_week: 1,
          period: 2,
        },
      });
    });

    test("group conflict query scopes to the normalized section only", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput({ section: "a" }), ADMIN_USER_ID);

      const groupWhere = mockTx.timetableSlot.findFirst.mock.calls[0][0].where;
      expect(groupWhere).toEqual({
        dept_id: 30,
        semester: 5,
        section: "A",
        day_of_week: 1,
        period: 2,
      });
      expect(groupWhere.section).not.toBe("a");
    });
  });

  describe("C. Group-period conflicts (scoped negatives)", () => {
    test("does not treat a different-section mock hit as the group query result when query is scoped", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      // Service asks specifically for section A; returning null means no group conflict.
      mockTx.timetableSlot.findFirst
        .mockResolvedValueOnce(null) // group
        .mockResolvedValueOnce(null) // room
        .mockResolvedValueOnce(null); // faculty

      await createTimetableSlot(baseSlotInput({ section: "A" }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[0][0].where.section).toBe("A");
      expect(mockTx.timetableSlot.create).toHaveBeenCalled();
    });

    test("group query includes semester and department so other cohorts are not matched", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk({ subject: subjectRecord({ semester: 5, dept_id: 30 }) });

      await createTimetableSlot(baseSlotInput(), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[0][0].where).toEqual(
        expect.objectContaining({
          dept_id: 30,
          semester: 5,
          section: "A",
        })
      );
    });
  });

  describe("D. Room conflicts", () => {
    function expectRoomOverlapQuery(requested) {
      const roomCall = mockTx.timetableSlot.findFirst.mock.calls[1][0].where;
      expect(roomCall).toEqual({
        day_of_week: requested.day_of_week,
        room: requested.room,
        start_time: { lt: requested.end_time },
        end_time: { gt: requested.start_time },
      });
    }

    test("returns 409 when room findFirst reports an overlapping booking", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockTx.timetableSlot.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdSlot({ timetable_id: 77, room: "CSE-301" }));

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 409);

      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
      expectRoomOverlapQuery(baseSlotInput());
    });

    test.each([
      ["exact overlap", "10:00", "11:00"],
      ["partial overlap", "10:30", "11:30"],
      ["existing contains requested", "10:15", "10:45"],
      ["requested contains existing", "09:30", "11:30"],
    ])("builds overlap query for %s (%s–%s)", async (_label, start_time, end_time) => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      const input = baseSlotInput({ start_time, end_time });
      await createTimetableSlot(input, ADMIN_USER_ID);

      expectRoomOverlapQuery(input);
    });

    test("queries a different room so a different room cannot match this conflict check", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput({ room: "LAB-2" }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[1][0].where.room).toBe("LAB-2");
      expect(mockTx.timetableSlot.create).toHaveBeenCalled();
    });

    test("scopes room conflict to the requested weekday", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(baseSlotInput({ day_of_week: 3 }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[1][0].where.day_of_week).toBe(3);
    });

    test("adjacent classes use exclusive overlap bounds (11:00–12:00 vs 10:00–11:00)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      const input = baseSlotInput({ start_time: "11:00", end_time: "12:00" });
      await createTimetableSlot(input, ADMIN_USER_ID);

      // Existing 10:00–11:00 would not satisfy end_time > 11:00, so Prisma returns null.
      expect(mockTx.timetableSlot.findFirst.mock.calls[1][0].where).toEqual({
        day_of_week: 1,
        room: "CSE-301",
        start_time: { lt: "12:00" },
        end_time: { gt: "11:00" },
      });
      expect(mockTx.timetableSlot.create).toHaveBeenCalled();
    });
  });

  describe("E. Faculty conflicts", () => {
    test("returns 409 when faculty findFirst reports an overlapping booking", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockTx.timetableSlot.findFirst
        .mockResolvedValueOnce(null) // group
        .mockResolvedValueOnce(null) // room
        .mockResolvedValueOnce(createdSlot({ timetable_id: 88, faculty_id: 20 }));

      await expectStatus(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID), 409);

      expect(mockTx.timetableSlot.create).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.findFirst.mock.calls[2][0].where).toEqual({
        day_of_week: 1,
        faculty_id: 20,
        start_time: { lt: "11:00" },
        end_time: { gt: "10:00" },
      });
    });

    test.each([
      ["exact overlap", "10:00", "11:00"],
      ["partial overlap", "10:30", "11:30"],
      ["existing contains requested", "10:15", "10:45"],
      ["requested contains existing", "09:30", "11:30"],
    ])("builds faculty overlap query for %s (%s–%s)", async (_label, start_time, end_time) => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      const input = baseSlotInput({ start_time, end_time });
      await createTimetableSlot(input, ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[2][0].where).toEqual({
        day_of_week: input.day_of_week,
        faculty_id: input.faculty_id,
        start_time: { lt: end_time },
        end_time: { gt: start_time },
      });
    });

    test("different faculty member is queried separately and allows create when clear", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk({ faculty: facultyRecord({ faculty_id: 99 }) });

      await createTimetableSlot(baseSlotInput({ faculty_id: 99 }), ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst.mock.calls[2][0].where.faculty_id).toBe(99);
      expect(mockTx.timetableSlot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ faculty_id: 99 }),
      });
    });

    test("adjacent faculty classes use exclusive overlap bounds", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      await createTimetableSlot(
        baseSlotInput({ start_time: "11:00", end_time: "12:00" }),
        ADMIN_USER_ID
      );

      expect(mockTx.timetableSlot.findFirst.mock.calls[2][0].where).toEqual({
        day_of_week: 1,
        faculty_id: 20,
        start_time: { lt: "12:00" },
        end_time: { gt: "11:00" },
      });
      expect(mockTx.timetableSlot.create).toHaveBeenCalled();
    });
  });

  describe("F. Successful creation", () => {
    test("creates and returns a valid timetable slot with normalized section", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      const saved = createdSlot({ section: "A", room: "CSE-301" });
      mockTx.timetableSlot.create.mockResolvedValue(saved);

      const result = await createTimetableSlot(baseSlotInput({ section: " a " }), ADMIN_USER_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 10_000,
      });

      expect(mockTx.timetableSlot.create).toHaveBeenCalledWith({
        data: {
          subject_id: 10,
          faculty_id: 20,
          dept_id: 30,
          semester: 5,
          section: "A",
          day_of_week: 1,
          period: 2,
          room: "CSE-301",
          start_time: "10:00",
          end_time: "11:00",
        },
      });
      expect(result).toEqual(saved);
    });
  });

  describe("G. Database errors and transaction behavior", () => {
    test("maps P2002 for the group-period unique constraint to 409", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockTx.timetableSlot.create.mockRejectedValue(
        prismaUniqueError(["dept_id", "semester", "section", "day_of_week", "period"])
      );

      await expect(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: "A timetable slot already exists for this group and period",
      });
    });

    test("maps unrecognized P2002 to the generic conflict message", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockTx.timetableSlot.create.mockRejectedValue(prismaUniqueError(["some_other_field"]));

      await expect(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: "A conflicting timetable slot already exists",
      });
    });

    test("retries P2034 transaction conflicts and succeeds on a later attempt", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      const saved = createdSlot();
      mockPrisma.$transaction
        .mockRejectedValueOnce(prismaSerializationError())
        .mockRejectedValueOnce(prismaSerializationError())
        .mockImplementationOnce(async (work, options) => {
          mockTransactionSuccess.lastOptions = options;
          return work(mockTx);
        });
      mockTx.timetableSlot.create.mockResolvedValue(saved);

      const result = await createTimetableSlot(baseSlotInput(), ADMIN_USER_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
      expect(mockTransactionSuccess.lastOptions).toEqual({
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 10_000,
      });
      expect(result).toEqual(saved);
    });

    test("propagates P2034 after all configured retry attempts fail", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      mockPrisma.$transaction.mockRejectedValue(prismaSerializationError());

      await expect(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: "A conflicting timetable change is already in progress",
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    test("does not convert an unrelated database error into a timetable conflict", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();

      const dbError = new Error("connection reset");
      dbError.code = "P1001";
      mockTx.timetableSlot.create.mockRejectedValue(dbError);

      await expect(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID)).rejects.toMatchObject({
        code: "P1001",
        message: "connection reset",
      });
    });

    test("P2002 raised by $transaction itself is also mapped to 409", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockRelatedEntitiesOk();
      mockPrisma.$transaction.mockRejectedValue(
        prismaUniqueError(["dept_id", "semester", "section", "day_of_week", "period"])
      );

      await expect(createTimetableSlot(baseSlotInput(), ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 409,
        message: "A timetable slot already exists for this group and period",
      });
    });
  });
});

describe("Timetable service — updateTimetableSlot()", () => {
  const SLOT_ID = 100;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionSuccess.lastOptions = undefined;
    mockTx.timetableSlot.findUnique.mockResolvedValue(createdSlot({ timetable_id: SLOT_ID }));
    mockTx.timetableSlot.findFirst.mockResolvedValue(null);
    mockTx.timetableSlot.update.mockResolvedValue(
      createdSlot({ timetable_id: SLOT_ID, room: "Lab 2" })
    );
    mockTxRelatedEntitiesOk();
    mockTransactionSuccess();
  });

  describe("A. Authorization and existence", () => {
    test("unknown user returns 404 and does not update", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expectStatus(updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID), 404);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
    });

    test("STUDENT receives 403 and does not update", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));

      await expectStatus(updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID), 403);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    test("FACULTY receives 403 and does not update", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));

      await expectStatus(updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID), 403);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    test("missing slot returns 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockTx.timetableSlot.findUnique.mockResolvedValue(null);

      await expectStatus(updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID), 404);

      expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
    });
  });

  describe("B. Partial update merge", () => {
    test("room-only PATCH updates room and preserves other editable fields", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      const updated = createdSlot({ timetable_id: SLOT_ID, room: "Lab 2" });
      mockTx.timetableSlot.update.mockResolvedValue(updated);

      const result = await updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID);

      expect(mockTx.timetableSlot.update).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
        data: {
          subject_id: 10,
          faculty_id: 20,
          dept_id: 30,
          semester: 5,
          section: "A",
          day_of_week: 1,
          period: 2,
          room: "Lab 2",
          start_time: "10:00",
          end_time: "11:00",
        },
      });
      expect(result).toEqual(updated);
      expect(mockTx.timetableSlot.update.mock.calls[0][0].data).not.toHaveProperty("timetable_id");
      expect(mockTx.timetableSlot.update.mock.calls[0][0].data).not.toHaveProperty("created_at");
    });

    test("unchanged schedule does not conflict with itself", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await updateTimetableSlot(SLOT_ID, { room: "CSE-301" }, ADMIN_USER_ID);

      for (const call of mockTx.timetableSlot.findFirst.mock.calls) {
        expect(call[0].where.NOT).toEqual({ timetable_id: SLOT_ID });
      }
      expect(mockTx.timetableSlot.update).toHaveBeenCalled();
    });

    test("partial start_time is validated against existing end_time", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await expect(
        updateTimetableSlot(SLOT_ID, { start_time: "11:30" }, ADMIN_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "End time must be after start time",
      });

      expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
    });

    test("valid partial start_time merges with existing end_time", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockTx.timetableSlot.update.mockResolvedValue(
        createdSlot({ timetable_id: SLOT_ID, start_time: "09:30" })
      );

      await updateTimetableSlot(SLOT_ID, { start_time: "09:30" }, ADMIN_USER_ID);

      expect(mockTx.timetableSlot.update).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
        data: expect.objectContaining({
          start_time: "09:30",
          end_time: "11:00",
          room: "CSE-301",
        }),
      });
    });

    test("normalizes patched section before conflict checks and update", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await updateTimetableSlot(SLOT_ID, { section: " b " }, ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst).toHaveBeenNthCalledWith(1, {
        where: expect.objectContaining({ section: "B", NOT: { timetable_id: SLOT_ID } }),
      });
      expect(mockTx.timetableSlot.update).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
        data: expect.objectContaining({ section: "B" }),
      });
    });
  });

  describe("C. Conflict detection", () => {
    test("returns 409 for group-period conflict with another slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockTx.timetableSlot.findFirst.mockResolvedValueOnce(
        createdSlot({ timetable_id: 999, period: 2 })
      );

      await expectStatus(updateTimetableSlot(SLOT_ID, { period: 2 }, ADMIN_USER_ID), 409);
      expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
    });

    test("returns 409 for room overlap with another slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockTx.timetableSlot.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdSlot({ timetable_id: 77, room: "Lab 2" }));

      await expect(
        updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Room is already booked during the requested time",
      });
    });

    test("returns 409 for faculty overlap with another slot", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockTx.timetableSlot.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdSlot({ timetable_id: 88, faculty_id: 20 }));

      await expect(
        updateTimetableSlot(SLOT_ID, { start_time: "10:00" }, ADMIN_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Faculty member already has a class during the requested time",
      });
    });

    test("excludes current timetable_id from all three conflict queries", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await updateTimetableSlot(SLOT_ID, { room: "Lab 9" }, ADMIN_USER_ID);

      expect(mockTx.timetableSlot.findFirst).toHaveBeenCalledTimes(3);
      expect(mockTx.timetableSlot.findFirst.mock.calls[0][0].where.NOT).toEqual({
        timetable_id: SLOT_ID,
      });
      expect(mockTx.timetableSlot.findFirst.mock.calls[1][0].where.NOT).toEqual({
        timetable_id: SLOT_ID,
      });
      expect(mockTx.timetableSlot.findFirst.mock.calls[2][0].where.NOT).toEqual({
        timetable_id: SLOT_ID,
      });
    });
  });

  describe("D. Transaction behavior", () => {
    test("loads the slot inside a serializable transaction", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 10_000,
      });
      expect(mockTx.timetableSlot.findUnique).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
      });
    });

    test("retries P2034 and maps P2002 to 409", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.$transaction
        .mockRejectedValueOnce(prismaSerializationError())
        .mockImplementationOnce(async (work, options) => {
          mockTransactionSuccess.lastOptions = options;
          return work(mockTx);
        });
      mockTx.timetableSlot.update.mockResolvedValue(createdSlot({ room: "Lab 2" }));

      const result = await updateTimetableSlot(SLOT_ID, { room: "Lab 2" }, ADMIN_USER_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(result.room).toBe("Lab 2");

      mockPrisma.$transaction.mockRejectedValue(
        prismaUniqueError(["dept_id", "semester", "section", "day_of_week", "period"])
      );

      await expect(
        updateTimetableSlot(SLOT_ID, { period: 3 }, ADMIN_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "A timetable slot already exists for this group and period",
      });
    });
  });
});

describe("Timetable controller — updateTimetableSlotController()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionSuccess.lastOptions = undefined;
    mockTx.timetableSlot.findUnique.mockResolvedValue(createdSlot());
    mockTx.timetableSlot.findFirst.mockResolvedValue(null);
    mockTx.timetableSlot.update.mockResolvedValue(createdSlot({ room: "Lab 2" }));
    mockTxRelatedEntitiesOk();
    mockTransactionSuccess();
  });

  test("reads req.params.timetable_id and forwards it to the service", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "100" },
      body: { room: "Lab 2" },
    };
    const res = mockResponse();

    await updateTimetableSlotController(req, res);

    expect(mockTx.timetableSlot.findUnique).toHaveBeenCalledWith({
      where: { timetable_id: 100 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Timetable slot updated successfully",
      slot: expect.objectContaining({ room: "Lab 2" }),
    });
  });

  test.each([
    ["abc", "non-integer"],
    ["0", "zero"],
    ["-1", "negative"],
    ["1.5", "non-integer number"],
    ["", "empty"],
  ])("returns 400 for invalid timetable ID (%s / %s)", async (rawId) => {
    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: rawId },
      body: { room: "Lab 2" },
    };
    const res = mockResponse();

    await updateTimetableSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid timetable ID" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test("maps nonexistent slot to 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockTx.timetableSlot.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "999" },
      body: { room: "Lab 2" },
    };
    const res = mockResponse();

    await updateTimetableSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Slot not found" });
  });

  test("maps non-admin service denial to 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "100" },
      body: { room: "Lab 2" },
    };
    const res = mockResponse();

    await updateTimetableSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });
});

describe("Timetable service — deleteTimetableSlot()", () => {
  const SLOT_ID = 100;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(createdSlot({ timetable_id: SLOT_ID }));
    mockPrisma.timetableSlot.delete.mockResolvedValue(createdSlot({ timetable_id: SLOT_ID }));
  });

  describe("A. Authorization", () => {
    test("unknown user returns 404 and does not delete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expectStatus(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID), 404);

      expect(mockPrisma.timetableSlot.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.timetableSlot.delete).not.toHaveBeenCalled();
    });

    test("STUDENT receives 403 and does not delete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));

      await expectStatus(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID), 403);

      expect(mockPrisma.timetableSlot.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.timetableSlot.delete).not.toHaveBeenCalled();
    });

    test("FACULTY receives 403 and does not delete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));

      await expectStatus(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID), 403);

      expect(mockPrisma.timetableSlot.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.timetableSlot.delete).not.toHaveBeenCalled();
    });

    test("ADMIN is permitted to delete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID);

      expect(mockPrisma.timetableSlot.delete).toHaveBeenCalled();
    });
  });

  describe("B. Deletion behavior", () => {
    test("deletes an existing slot and returns the deleted record", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      const deleted = createdSlot({ timetable_id: SLOT_ID, room: "CSE-301" });
      mockPrisma.timetableSlot.delete.mockResolvedValue(deleted);

      const result = await deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID);

      expect(result).toEqual(deleted);
      expect(mockPrisma.timetableSlot.findUnique).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
      });
      expect(mockPrisma.timetableSlot.delete).toHaveBeenCalledWith({
        where: { timetable_id: SLOT_ID },
      });
    });

    test("passes the correct timetable_id to Prisma", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());

      await deleteTimetableSlot(42, ADMIN_USER_ID);

      expect(mockPrisma.timetableSlot.findUnique).toHaveBeenCalledWith({
        where: { timetable_id: 42 },
      });
      expect(mockPrisma.timetableSlot.delete).toHaveBeenCalledWith({
        where: { timetable_id: 42 },
      });
    });

    test("nonexistent slot returns 404 without calling delete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.timetableSlot.findUnique.mockResolvedValue(null);

      await expect(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: "Slot not found",
      });

      expect(mockPrisma.timetableSlot.delete).not.toHaveBeenCalled();
    });

    test("maps Prisma P2025 to 404", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      mockPrisma.timetableSlot.delete.mockRejectedValue(prismaRecordNotFoundError());

      await expect(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: "Slot not found",
      });
    });

    test("unexpected database errors propagate and do not report success", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser());
      const dbError = new Error("connection reset");
      dbError.code = "P1001";
      mockPrisma.timetableSlot.delete.mockRejectedValue(dbError);

      await expect(deleteTimetableSlot(SLOT_ID, ADMIN_USER_ID)).rejects.toMatchObject({
        code: "P1001",
        message: "connection reset",
      });
      expect(mockPrisma.timetableSlot.delete).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Timetable controller — deletedSlotController()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(createdSlot());
    mockPrisma.timetableSlot.delete.mockResolvedValue(createdSlot({ room: "CSE-301" }));
  });

  test("valid ID and successful deletion returns 200 with deleted record", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "100" },
    };
    const res = mockResponse();

    await deletedSlotController(req, res);

    expect(mockPrisma.timetableSlot.delete).toHaveBeenCalledWith({
      where: { timetable_id: 100 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Timetable slot deleted successfully",
      deletedSlot: expect.objectContaining({
        timetable_id: 100,
        room: "CSE-301",
      }),
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/stack|password|jwt|Bearer/i);
  });

  test.each([
    ["abc", "non-numeric"],
    ["0", "zero"],
    ["-1", "negative"],
    ["1.5", "decimal"],
    ["", "empty"],
  ])("returns 400 for invalid timetable ID (%s / %s)", async (rawId) => {
    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: rawId },
    };
    const res = mockResponse();

    await deletedSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid timetable ID" });
    expect(mockPrisma.timetableSlot.delete).not.toHaveBeenCalled();
  });

  test("maps service 404 to HTTP 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "999" },
    };
    const res = mockResponse();

    await deletedSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Slot not found" });
  });

  test("maps service 403 to HTTP 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "100" },
    };
    const res = mockResponse();

    await deletedSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });

  test("maps unexpected errors to HTTP 500 without leaking internals", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.delete.mockRejectedValue(new Error("Unexpected failure"));

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "100" },
    };
    const res = mockResponse();

    await deletedSlotController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unexpected failure" });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("stack");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(
      /DATABASE_URL|passwordHash|jwt|secret/i
    );
  });
});

describe("Timetable service — getTimetable()", () => {
  const slots = [
    createdSlot({ timetable_id: 1, day_of_week: 1, period: 1 }),
    createdSlot({ timetable_id: 2, day_of_week: 1, period: 3 }),
    createdSlot({ timetable_id: 3, day_of_week: 2, period: 1 }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findMany.mockResolvedValue(slots);
  });

  test("unknown user returns 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expectStatus(getTimetable(30, 5, "A", ADMIN_USER_ID), 404);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("ADMIN can fetch a timetable ordered by day then period", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    const result = await getTimetable(30, 5, " a ", ADMIN_USER_ID);

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
      where: { dept_id: 30, semester: 5, section: "A" },
      include: TIMETABLE_SLOT_READ_INCLUDE,
      orderBy: [{ day_of_week: "asc" }, { period: "asc" }],
    });
    expect(result).toEqual(slots);
  });

  test("FACULTY in the same department can fetch", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));

    await getTimetable(30, 5, "A", ADMIN_USER_ID);

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalled();
  });

  test("FACULTY in another department receives 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 99 }));

    await expectStatus(getTimetable(30, 5, "A", ADMIN_USER_ID), 403);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("FACULTY without a profile receives 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(null);

    await expect(getTimetable(30, 5, "A", ADMIN_USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Faculty profile not found",
    });
  });

  test("STUDENT can fetch their own department, semester, and section", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    await getTimetable(30, 5, "a", ADMIN_USER_ID);

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
      where: { dept_id: 30, semester: 5, section: "A" },
      include: TIMETABLE_SLOT_READ_INCLUDE,
      orderBy: [{ day_of_week: "asc" }, { period: "asc" }],
    });
  });

  test("STUDENT requesting another section/semester/department receives 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    await expectStatus(getTimetable(30, 5, "B", ADMIN_USER_ID), 403);
    await expectStatus(getTimetable(30, 6, "A", ADMIN_USER_ID), 403);
    await expectStatus(getTimetable(99, 5, "A", ADMIN_USER_ID), 403);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("STUDENT without a profile receives 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(getTimetable(30, 5, "A", ADMIN_USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Student profile not found",
    });
  });

  test("unsupported role receives 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "GUEST" }));

    await expectStatus(getTimetable(30, 5, "A", ADMIN_USER_ID), 403);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("invalid parameters return 400", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    await expectStatus(getTimetable(0, 5, "A", ADMIN_USER_ID), 400);
    await expectStatus(getTimetable(30, 0, "A", ADMIN_USER_ID), 400);
    await expectStatus(getTimetable(30, 9, "A", ADMIN_USER_ID), 400);
    await expectStatus(getTimetable(30, 5, "   ", ADMIN_USER_ID), 400);
  });

  test("empty result set returns an empty array", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findMany.mockResolvedValue([]);

    await expect(getTimetable(30, 5, "Z", ADMIN_USER_ID)).resolves.toEqual([]);
  });
});

describe("Timetable controller — getTimetableController()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findMany.mockResolvedValue([createdSlot()]);
  });

  test("parses query params and returns 200 with timetable array", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    const req = {
      user: { userId: ADMIN_USER_ID },
      query: { dept_id: "30", semester: "5", section: "A" },
    };
    const res = mockResponse();

    await getTimetableController(req, res);

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
      where: { dept_id: 30, semester: 5, section: "A" },
      include: TIMETABLE_SLOT_READ_INCLUDE,
      orderBy: [{ day_of_week: "asc" }, { period: "asc" }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Timetable fetched successfully",
      timetable: [expect.objectContaining({ timetable_id: 100 })],
    });
  });

  test.each([
    [{ semester: "5", section: "A" }, "missing dept_id"],
    [{ dept_id: "30", section: "A" }, "missing semester"],
    [{ dept_id: "30", semester: "5" }, "missing section"],
    [{ dept_id: "abc", semester: "5", section: "A" }, "non-numeric dept"],
    [{ dept_id: "30", semester: "x", section: "A" }, "non-numeric semester"],
    [{ dept_id: "1.5", semester: "5", section: "A" }, "decimal dept"],
    [{ dept_id: "30", semester: "2.5", section: "A" }, "decimal semester"],
    [{ dept_id: "30", semester: "5", section: "   " }, "whitespace section"],
    [{ dept_id: "30", semester: "5", section: "" }, "empty section"],
  ])("returns 400 for invalid query (%s)", async (query) => {
    const req = { user: { userId: ADMIN_USER_ID }, query };
    const res = mockResponse();

    await getTimetableController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid timetable query parameters",
    });
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("maps service 403 to HTTP 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    const req = {
      user: { userId: ADMIN_USER_ID },
      query: { dept_id: "30", semester: "5", section: "B" },
    };
    const res = mockResponse();

    await getTimetableController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });

  test("maps unexpected errors to 500 without leaking internals", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findMany.mockRejectedValue(new Error("Unexpected failure"));

    const req = {
      user: { userId: ADMIN_USER_ID },
      query: { dept_id: "30", semester: "5", section: "A" },
    };
    const res = mockResponse();

    await getTimetableController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unexpected failure" });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("stack");
  });
});

describe("getKolkataDayOfWeek()", () => {
  test("maps Monday through Saturday to 1–6 and Sunday to 7 in Asia/Kolkata", () => {
    // Fixed UTC instants that fall on known weekdays in IST (UTC+5:30).
    expect(getKolkataDayOfWeek(new Date("2026-10-12T06:00:00.000Z"))).toBe(1); // Mon
    expect(getKolkataDayOfWeek(new Date("2026-10-13T06:00:00.000Z"))).toBe(2); // Tue
    expect(getKolkataDayOfWeek(new Date("2026-10-14T06:00:00.000Z"))).toBe(3); // Wed
    expect(getKolkataDayOfWeek(new Date("2026-10-15T06:00:00.000Z"))).toBe(4); // Thu
    expect(getKolkataDayOfWeek(new Date("2026-10-16T06:00:00.000Z"))).toBe(5); // Fri
    expect(getKolkataDayOfWeek(new Date("2026-10-17T06:00:00.000Z"))).toBe(6); // Sat
    expect(getKolkataDayOfWeek(new Date("2026-10-11T06:00:00.000Z"))).toBe(7); // Sun
  });

  test("uses Asia/Kolkata midnight, not UTC midnight", () => {
    // 18:29:59.999Z on Oct 12 = 23:59:59.999 IST Monday → 1
    expect(getKolkataDayOfWeek(new Date("2026-10-12T18:29:59.999Z"))).toBe(1);
    // 18:30:00.000Z on Oct 12 = 00:00:00.000 IST Tuesday → 2
    expect(getKolkataDayOfWeek(new Date("2026-10-12T18:30:00.000Z"))).toBe(2);

    // UTC midnight is still Tuesday morning in IST
    expect(getKolkataDayOfWeek(new Date("2026-10-12T23:59:59.999Z"))).toBe(2);
    expect(getKolkataDayOfWeek(new Date("2026-10-13T00:00:00.000Z"))).toBe(2);
  });

  test("JavaScript Sunday (getDay()===0) maps to database day 7", () => {
    const sundayIst = new Date("2026-10-11T06:00:00.000Z");
    expect(sundayIst.getUTCDay()).toBe(0);
    expect(getKolkataDayOfWeek(sundayIst)).toBe(7);
  });

  test("uses weekday number, not day-of-month", () => {
    const tuesdayThe13th = new Date("2026-10-13T06:00:00.000Z");
    expect(tuesdayThe13th.getUTCDate()).toBe(13);
    expect(getKolkataDayOfWeek(tuesdayThe13th)).toBe(2);

    const saturdayThe17th = new Date("2026-10-17T06:00:00.000Z");
    expect(saturdayThe17th.getUTCDate()).toBe(17);
    expect(getKolkataDayOfWeek(saturdayThe17th)).toBe(6);
  });

  test("Saturday to Sunday boundary in Asia/Kolkata maps 6 then 7", () => {
    // 18:29:59.999Z Sat Oct 17 = 23:59:59.999 IST Saturday → 6
    expect(getKolkataDayOfWeek(new Date("2026-10-17T18:29:59.999Z"))).toBe(6);
    // 18:30:00.000Z Sat Oct 17 = 00:00:00.000 IST Sunday → 7
    expect(getKolkataDayOfWeek(new Date("2026-10-17T18:30:00.000Z"))).toBe(7);
  });
});

describe("Timetable service — getTodayTimetable()", () => {
  const now = new Date("2026-10-13T06:00:00.000Z"); // Tuesday IST → day_of_week 2

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      createdSlot({ day_of_week: 2, period: 1, exceptions: [] }),
      createdSlot({ day_of_week: 2, period: 2, timetable_id: 101, exceptions: [] }),
    ]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);
  });

  test("unknown user returns 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expectStatus(getTodayTimetable(ADMIN_USER_ID, { now }), 404);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("ADMIN queries today's weekday and orders by period", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    await getTodayTimetable(ADMIN_USER_ID, { now });

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
      where: { day_of_week: 2 },
      include: expect.objectContaining({
        exceptions: expect.any(Object),
      }),
      orderBy: [{ period: "asc" }, { start_time: "asc" }],
    });
  });

  test("FACULTY queries today's occurrences and keeps only their faculty_id", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ faculty_id: 20, dept_id: 30 }));

    const result = await getTodayTimetable(ADMIN_USER_ID, { now });

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { day_of_week: 2 },
      })
    );
    expect(result.every((entry) => entry.faculty_id === 20)).toBe(true);
  });

  test("FACULTY without profile returns 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(null);

    await expect(getTodayTimetable(ADMIN_USER_ID, { now })).rejects.toMatchObject({
      statusCode: 404,
      message: "Faculty profile not found",
    });
  });

  test("STUDENT queries own dept/semester/section for today", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "a",
    });

    const result = await getTodayTimetable(ADMIN_USER_ID, { now });

    expect(
      result.every((entry) => entry.dept_id === 30 && entry.semester === 5 && entry.section === "A")
    ).toBe(true);
  });

  test("STUDENT without profile returns 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(getTodayTimetable(ADMIN_USER_ID, { now })).rejects.toMatchObject({
      statusCode: 404,
      message: "Student profile not found",
    });
  });

  test("unsupported role returns 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "GUEST" }));

    await expectStatus(getTodayTimetable(ADMIN_USER_ID, { now }), 403);
    expect(mockPrisma.timetableSlot.findMany).not.toHaveBeenCalled();
  });

  test("empty result returns an empty array", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findMany.mockResolvedValue([]);

    await expect(getTodayTimetable(ADMIN_USER_ID, { now })).resolves.toEqual([]);
  });
});

describe("Timetable controller — getTodayTimetableController()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      createdSlot({ day_of_week: getKolkataDayOfWeek(), period: 1, exceptions: [] }),
    ]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);
  });

  test("uses authenticated req.user.userId and ignores client-supplied identity", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());

    const req = {
      user: { userId: ADMIN_USER_ID, role: "ADMIN" },
      query: { user_id: "999", faculty_id: "888", dept_id: "1" },
      body: { user_id: 999, dept_id: 1 },
    };
    const res = mockResponse();

    await getTodayTimetableController(req, res);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { user_id: ADMIN_USER_ID },
      select: { user_id: true, role: true },
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 999 } })
    );
    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          faculty_id: 888,
          dept_id: 1,
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Today's timetable fetched successfully",
      timetable: [expect.objectContaining({ period: 1 })],
    });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("stack");
  });

  test("STUDENT spoof query still loads the authenticated student profile only", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    const req = {
      user: { userId: ADMIN_USER_ID, role: "STUDENT" },
      query: { user_id: "777", faculty_id: "20", dept_id: "99", section: "Z", semester: "1" },
      body: {},
    };
    const res = mockResponse();

    await getTodayTimetableController(req, res);

    expect(mockPrisma.student.findUnique).toHaveBeenCalledWith({
      where: { user_id: ADMIN_USER_ID },
      select: {
        student_id: true,
        user_id: true,
        dept_id: true,
        semester: true,
        section: true,
      },
    });
    const where = mockPrisma.timetableSlot.findMany.mock.calls[0][0].where;
    expect(where).not.toMatchObject({ dept_id: 99, semester: 1, section: "Z" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].timetable.every((entry) => entry.section === "A")).toBe(true);
  });

  test("maps service 404 to HTTP 404", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(null);

    const req = { user: { userId: ADMIN_USER_ID }, query: {}, body: {} };
    const res = mockResponse();

    await getTodayTimetableController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Faculty profile not found" });
  });

  test("maps unexpected errors to 500 without leaking internals", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findMany.mockRejectedValue(new Error("Unexpected failure"));

    const req = { user: { userId: ADMIN_USER_ID }, query: {}, body: {} };
    const res = mockResponse();

    await getTodayTimetableController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unexpected failure" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(
      /DATABASE_URL|passwordHash|stack/i
    );
  });
});

describe("Timetable validator — updateTimetableSlotSchema", () => {
  test("accepts a partial room update", () => {
    const result = updateTimetableSlotSchema.safeParse({ room: "Lab 2" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ room: "Lab 2" });
  });

  test("rejects an empty update body", () => {
    const result = updateTimetableSlotSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects unknown fields", () => {
    const result = updateTimetableSlotSchema.safeParse({
      room: "Lab 2",
      unexpected: true,
    });
    expect(result.success).toBe(false);
  });

  test("allows partial time fields; final range checked via validateMergedSlotTimes", () => {
    const partial = updateTimetableSlotSchema.safeParse({ start_time: "10:00" });
    expect(partial.success).toBe(true);

    const bothInvalid = updateTimetableSlotSchema.safeParse({
      start_time: "11:00",
      end_time: "10:00",
    });
    expect(bothInvalid.success).toBe(false);

    const mergedInvalid = validateMergedSlotTimes(
      { start_time: "10:00", end_time: "11:00" },
      { start_time: "11:30" }
    );
    expect(mergedInvalid.success).toBe(false);

    const mergedValid = validateMergedSlotTimes(
      { start_time: "10:00", end_time: "11:00" },
      { start_time: "09:30" }
    );
    expect(mergedValid).toEqual({
      success: true,
      merged: { start_time: "09:30", end_time: "11:00" },
    });
  });

  test("validate middleware rejects empty PATCH bodies with 400", () => {
    const req = { body: {} };
    const res = mockResponse();

    runMiddleware(validate(updateTimetableSlotSchema), req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Validation failed",
        errors: expect.any(Array),
      })
    );
  });

  test("create schema still requires every field", () => {
    const result = createTimetableSlotSchema.safeParse({ room: "Lab 2" });
    expect(result.success).toBe(false);
  });
});

describe("Timetable service — ROOM_TIME_CHANGE exceptions", () => {
  const SLOT_ID = 100;
  // Monday in Asia/Kolkata — matches createdSlot().day_of_week === 1
  const monday = new Date(Date.UTC(2026, 9, 12));
  const slot = createdSlot({ timetable_id: SLOT_ID, day_of_week: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionSuccess.lastOptions = undefined;
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockTx.timetableSlot.findUnique.mockResolvedValue(slot);
    mockTx.timetableSlot.findMany.mockResolvedValue([]);
    mockTx.timetableException.findMany.mockResolvedValue([]);
    mockTx.timetableException.create.mockResolvedValue({
      timetable_exception_id: 1,
      timetable_id: SLOT_ID,
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
      start_time: null,
      end_time: null,
      period: null,
      reason: "Projector failure",
    });
    mockTx.timetableSlot.update.mockResolvedValue(slot);
    mockTransactionSuccess();
  });

  test("room-only change preserves original times and does not mutate the weekly slot", async () => {
    const result = await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
      reason: "Projector failure",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: {
        timetable_id: SLOT_ID,
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        room: "Lab 2",
        reason: "Projector failure",
      },
    });
    expect(mockTx.timetableException.create.mock.calls[0][0].data).not.toHaveProperty(
      "rescheduled_date"
    );
    expect(mockTx.timetableException.create.mock.calls[0][0].data).not.toHaveProperty("start_time");
    expect(mockTx.timetableException.create.mock.calls[0][0].data).not.toHaveProperty("end_time");
    expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
    expect(result.exception_type).toBe("ROOM_TIME_CHANGE");
  });

  test("room and time change stores supplied overrides and validates merged range", async () => {
    mockTx.timetableException.create.mockResolvedValue({
      timetable_exception_id: 2,
      timetable_id: SLOT_ID,
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 3",
      start_time: "11:00",
      end_time: "12:00",
    });

    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 3",
      start_time: "11:00",
      end_time: "12:00",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        room: "Lab 3",
        start_time: "11:00",
        end_time: "12:00",
        exception_type: "ROOM_TIME_CHANGE",
      }),
    });
  });

  test("invalid time range returns 400", async () => {
    await expect(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        start_time: "11:30",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "End time must be after start time",
    });
    expect(mockTx.timetableException.create).not.toHaveBeenCalled();
  });

  test("overlapping weekly slot returns 409", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          room: "Lab 2",
          start_time: "10:30",
          end_time: "11:30",
          day_of_week: 1,
        }),
        exceptions: [],
      },
    ]);

    await expect(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        room: "Lab 2",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Room is already booked during the requested time",
    });
  });

  test("adjacent non-overlapping weekly interval is allowed", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([]);

    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
      start_time: "11:00",
      end_time: "12:00",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalled();
  });

  test("existing CANCELLED exception frees the room", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          room: "Lab 2",
          start_time: "10:00",
          end_time: "11:00",
          day_of_week: 1,
        }),
        exceptions: [
          {
            exception_type: "CANCELLED",
            original_date: monday,
          },
        ],
      },
    ]);

    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalled();
  });

  test("existing ROOM_TIME_CHANGE occupies its effective room", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 300,
          room: "Hall 1",
          start_time: "09:00",
          end_time: "10:00",
          day_of_week: 1,
        }),
        exceptions: [
          {
            timetable_id: 300,
            exception_type: "ROOM_TIME_CHANGE",
            original_date: monday,
            room: "Lab 2",
            start_time: "10:30",
            end_time: "11:30",
          },
        ],
      },
    ]);
    mockTx.timetableException.findMany.mockResolvedValue([]);

    await expect(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        room: "Lab 2",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Room is already booked during the requested time",
    });
  });

  test("ROOM_TIME_CHANGE time shift conflicts with the same faculty member", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          faculty_id: 20,
          room: "OTHER",
          section: "B",
          start_time: "11:00",
          end_time: "12:00",
          day_of_week: 1,
        }),
        exceptions: [],
      },
    ]);

    await expect(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        start_time: "11:00",
        end_time: "12:00",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Faculty member already has a class during the requested time",
    });
  });

  test("ROOM_TIME_CHANGE time shift conflicts with the same section", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          faculty_id: 99,
          room: "OTHER",
          section: "A",
          start_time: "11:00",
          end_time: "12:00",
          day_of_week: 1,
        }),
        exceptions: [],
      },
    ]);

    await expect(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        start_time: "11:00",
        end_time: "12:00",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "This period is already assigned to the selected group",
    });
  });

  test("outbound RESCHEDULED frees the original room for a ROOM_TIME_CHANGE", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          room: "Lab 2",
          start_time: "10:00",
          end_time: "11:00",
          day_of_week: 1,
        }),
        exceptions: [
          {
            timetable_id: 200,
            exception_type: "RESCHEDULED",
            original_date: monday,
            rescheduled_date: new Date(Date.UTC(2026, 9, 13)),
          },
        ],
      },
    ]);

    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalled();
  });

  test("nonexistent slot returns 404", async () => {
    mockTx.timetableSlot.findUnique.mockResolvedValue(null);

    await expectStatus(
      changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        room: "Lab 2",
      }),
      404
    );
    expect(mockTx.timetableException.create).not.toHaveBeenCalled();
  });

  test("handleTimetableException rejects unsupported types", async () => {
    await expect(
      handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "UNKNOWN",
        original_date: monday,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Unsupported exception type",
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test("handleTimetableException dispatches ROOM_TIME_CHANGE", async () => {
    await handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
      reason: "Maintenance",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exception_type: "ROOM_TIME_CHANGE",
        room: "Lab 2",
        reason: "Maintenance",
      }),
    });
  });

  test("excludes the current slot from weekly conflict checks", async () => {
    mockTx.timetableSlot.findMany.mockResolvedValue([{ ...slot, exceptions: [] }]);

    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "CSE-301",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalled();
  });

  test("conflict checks and create run inside a serializable transaction", async () => {
    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
      maxWait: 5_000,
      timeout: 10_000,
    });
  });

  test("reason is the provided note, not a substitute for exception_type", async () => {
    await changeRoomTimeTimetable(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "ROOM_TIME_CHANGE",
      original_date: monday,
      room: "Lab 2",
      reason: "AC repair in CSE-301",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exception_type: "ROOM_TIME_CHANGE",
        reason: "AC repair in CSE-301",
      }),
    });
  });

  test("handleTimetableException dispatches CANCELLED without mutating the slot", async () => {
    mockTx.timetableException.create.mockResolvedValue({
      timetable_exception_id: 9,
      exception_type: "CANCELLED",
      timetable_id: SLOT_ID,
      original_date: monday,
    });

    await handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "CANCELLED",
      original_date: monday,
      reason: "Holiday",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: {
        timetable_id: SLOT_ID,
        exception_type: "CANCELLED",
        original_date: monday,
        reason: "Holiday",
      },
    });
    expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
  });

  test("faculty substitution checks replacement faculty and occupancy", async () => {
    mockTx.faculty.findUnique.mockResolvedValue(facultyRecord({ faculty_id: 21, dept_id: 30 }));
    mockTx.timetableException.create.mockResolvedValue({
      exception_type: "FACULTY_SUBSTITUTION",
      replacement_faculty_id: 21,
    });

    await handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "FACULTY_SUBSTITUTION",
      original_date: monday,
      replacement_faculty_id: 21,
    });

    expect(mockTx.faculty.findUnique).toHaveBeenCalledWith({
      where: { faculty_id: 21 },
    });
    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exception_type: "FACULTY_SUBSTITUTION",
        replacement_faculty_id: 21,
      }),
    });
  });

  test("FACULTY_SUBSTITUTION conflicts when the replacement faculty is already teaching", async () => {
    mockTx.faculty.findUnique.mockResolvedValue(facultyRecord({ faculty_id: 21, dept_id: 30 }));
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          faculty_id: 21,
          room: "OTHER",
          section: "B",
          start_time: "10:00",
          end_time: "11:00",
          day_of_week: 1,
        }),
        exceptions: [],
      },
    ]);

    await expect(
      handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "FACULTY_SUBSTITUTION",
        original_date: monday,
        replacement_faculty_id: 21,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Faculty member already has a class during the requested time",
    });
    expect(mockTx.timetableException.create).not.toHaveBeenCalled();
  });

  test("reschedule suppresses the original date and checks the destination", async () => {
    const tuesday = new Date(Date.UTC(2026, 9, 13));
    mockTx.timetableException.create.mockResolvedValue({
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: tuesday,
    });

    await handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: tuesday,
      room: "Hall 9",
    });

    expect(mockTx.timetableException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exception_type: "RESCHEDULED",
        original_date: monday,
        rescheduled_date: tuesday,
        room: "Hall 9",
      }),
    });
    expect(mockTx.timetableSlot.update).not.toHaveBeenCalled();
  });

  test("RESCHEDULED conflicts with an existing destination-date class", async () => {
    const tuesday = new Date(Date.UTC(2026, 9, 13));
    mockTx.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          day_of_week: 2,
          room: "Hall 9",
          faculty_id: 99,
          section: "B",
          start_time: "15:00",
          end_time: "16:00",
        }),
        exceptions: [],
      },
    ]);
    mockTx.timetableException.findMany.mockResolvedValue([]);

    await expect(
      handleTimetableException(ADMIN_USER_ID, SLOT_ID, {
        exception_type: "RESCHEDULED",
        original_date: monday,
        rescheduled_date: tuesday,
        room: "Hall 9",
        start_time: "15:00",
        end_time: "16:00",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Room is already booked during the requested time",
    });
    expect(mockTx.timetableException.create).not.toHaveBeenCalled();
  });
});

describe("Effective occurrence helper", () => {
  const monday = new Date(Date.UTC(2026, 9, 12));
  const tuesday = new Date(Date.UTC(2026, 9, 13));
  const nextMonday = new Date(Date.UTC(2026, 9, 19));
  const slot = createdSlot({
    day_of_week: 1,
    room: "CSE-301",
    faculty_id: 20,
    faculty: { faculty_id: 20, full_name: "Original Faculty" },
  });

  test("returns the weekly occurrence when no exception exists", () => {
    const occurrence = resolveOccurrenceOnDate(slot, monday, []);
    expect(occurrence).toEqual(
      expect.objectContaining({
        timetable_id: 100,
        room: "CSE-301",
        faculty_id: 20,
        exception_type: null,
      })
    );
  });

  test("CANCELLED suppresses the original occurrence", () => {
    expect(
      resolveOccurrenceOnDate(slot, monday, [
        { exception_type: "CANCELLED", original_date: monday, timetable_id: 100 },
      ])
    ).toBeNull();
  });

  test("ROOM_TIME_CHANGE uses the effective room and times", () => {
    const occurrence = resolveOccurrenceOnDate(slot, monday, [
      {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        timetable_id: 100,
        room: "Lab 2",
        start_time: "11:00",
        end_time: "12:00",
      },
    ]);
    expect(occurrence).toEqual(
      expect.objectContaining({
        room: "Lab 2",
        start_time: "11:00",
        end_time: "12:00",
        exception_type: "ROOM_TIME_CHANGE",
      })
    );
  });

  test("ROOM_TIME_CHANGE omitted fields keep original period and faculty", () => {
    const occurrence = resolveOccurrenceOnDate(slot, monday, [
      {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: monday,
        timetable_id: 100,
        room: "Lab 2",
        period: null,
        start_time: null,
        end_time: null,
        replacement_faculty_id: null,
      },
    ]);

    expect(occurrence).toEqual(
      expect.objectContaining({
        room: "Lab 2",
        period: slot.period,
        start_time: slot.start_time,
        end_time: slot.end_time,
        faculty_id: 20,
      })
    );
  });

  test("FACULTY_SUBSTITUTION uses the replacement faculty and clears mismatched nested faculty", () => {
    const occurrence = resolveOccurrenceOnDate(slot, monday, [
      {
        exception_type: "FACULTY_SUBSTITUTION",
        original_date: monday,
        timetable_id: 100,
        replacement_faculty_id: 21,
      },
    ]);
    expect(occurrence.faculty_id).toBe(21);
    expect(occurrence.faculty).toBeNull();
  });

  test("FACULTY_SUBSTITUTION prefers loaded replacement_faculty relation", () => {
    const occurrence = buildEffectiveOccurrence(slot, monday, {
      exception_type: "FACULTY_SUBSTITUTION",
      replacement_faculty_id: 21,
      replacement_faculty: { faculty_id: 21, full_name: "Substitute" },
    });

    expect(occurrence.faculty_id).toBe(21);
    expect(occurrence.faculty).toEqual({ faculty_id: 21, full_name: "Substitute" });
  });

  test("RESCHEDULED suppresses the original and appears on the destination date", () => {
    const exception = {
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: tuesday,
      timetable_id: 100,
      room: "Hall 9",
    };

    expect(resolveOccurrenceOnDate(slot, monday, [exception])).toBeNull();
    expect(resolveOccurrenceOnDate(slot, tuesday, [exception])).toEqual(
      expect.objectContaining({
        room: "Hall 9",
        exception_type: "RESCHEDULED",
        date: "2026-10-13",
      })
    );
  });

  test("RESCHEDULED onto another Monday yields exactly one occurrence", () => {
    const exception = {
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: nextMonday,
      timetable_id: 100,
      room: "Hall 9",
    };

    expect(resolveOccurrenceOnDate(slot, monday, [exception])).toBeNull();
    expect(resolveOccurrenceOnDate(slot, nextMonday, [exception])).toEqual(
      expect.objectContaining({
        timetable_id: 100,
        room: "Hall 9",
        exception_type: "RESCHEDULED",
        date: "2026-10-19",
      })
    );
  });

  test("getEffectiveTimetable rejects a student spoofing another section", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });
    mockPrisma.timetableSlot.findMany.mockResolvedValue([]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);

    await expectStatus(
      getEffectiveTimetable(ADMIN_USER_ID, {
        date: monday,
        dept_id: 30,
        semester: 5,
        section: "B",
      }),
      403
    );
  });
});

describe("Date keys, Kolkata boundaries, and interval overlap", () => {
  test("toDateKey normalizes Date and YYYY-MM-DD strings to the same key", () => {
    expect(toDateKey(new Date(Date.UTC(2026, 9, 12)))).toBe("2026-10-12");
    expect(toDateKey("2026-10-12")).toBe("2026-10-12");
    expect(toDateKey("2026-10-12T00:00:00.000Z")).toBe("2026-10-12");
    expect(sameCalendarDate(new Date(Date.UTC(2026, 9, 12)), "2026-10-12")).toBe(true);
  });

  test("parseDateOnly rejects invalid calendar dates instead of rolling over", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("2026-04-31")).toBeNull();
    expect(parseDateOnly("2026-10-12")).toEqual(new Date(Date.UTC(2026, 9, 12)));
  });

  test("getKolkataDateOnly uses Asia/Kolkata calendar date around midnight", () => {
    // 18:29:59.999Z Mon Oct 12 = 23:59:59.999 IST Monday → 2026-10-12
    expect(toDateKey(getKolkataDateOnly(new Date("2026-10-12T18:29:59.999Z")))).toBe("2026-10-12");
    // 18:30:00.000Z Mon Oct 12 = 00:00:00.000 IST Tuesday → 2026-10-13
    expect(toDateKey(getKolkataDateOnly(new Date("2026-10-12T18:30:00.000Z")))).toBe("2026-10-13");
    // UTC midnight Tue Oct 13 is still Tuesday morning in Kolkata
    expect(toDateKey(getKolkataDateOnly(new Date("2026-10-13T00:00:00.000Z")))).toBe("2026-10-13");
  });

  test("UTC timestamp on a different Kolkata calendar date maps correctly", () => {
    // 2026-10-11T20:00:00Z = 2026-10-12 01:30 IST Monday
    const utcSundayEvening = new Date("2026-10-11T20:00:00.000Z");
    expect(getKolkataDayOfWeek(utcSundayEvening)).toBe(1);
    expect(toDateKey(getKolkataDateOnly(utcSundayEvening))).toBe("2026-10-12");
  });

  test("timesOverlap rejects adjacent intervals and accepts a one-minute overlap", () => {
    expect(timesOverlap("10:00", "11:00", "11:00", "12:00")).toBe(false);
    expect(timesOverlap("10:00", "11:00", "10:59", "12:00")).toBe(true);
    expect(timesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  test("occurrenceConflictKind self-excludes when date types differ", () => {
    const left = {
      timetable_id: 100,
      date: new Date(Date.UTC(2026, 9, 12)),
      room: "CSE-301",
      faculty_id: 20,
      dept_id: 30,
      semester: 5,
      section: "A",
      start_time: "10:00",
      end_time: "11:00",
    };
    const right = {
      ...left,
      date: "2026-10-12",
    };

    expect(occurrenceConflictKind(left, right)).toBeNull();
  });

  test("occurrenceConflictKind detects room, faculty, and section overlaps", () => {
    const base = {
      timetable_id: 100,
      date: "2026-10-12",
      room: "CSE-301",
      faculty_id: 20,
      dept_id: 30,
      semester: 5,
      section: "A",
      start_time: "10:00",
      end_time: "11:00",
    };

    expect(
      occurrenceConflictKind(base, {
        ...base,
        timetable_id: 200,
        faculty_id: 21,
        section: "B",
      })
    ).toBe("room");

    expect(
      occurrenceConflictKind(base, {
        ...base,
        timetable_id: 200,
        room: "OTHER",
        section: "B",
      })
    ).toBe("faculty");

    expect(
      occurrenceConflictKind(base, {
        ...base,
        timetable_id: 200,
        room: "OTHER",
        faculty_id: 21,
      })
    ).toBe("section");

    expect(
      occurrenceConflictKind(base, {
        ...base,
        timetable_id: 200,
        room: "OTHER",
        faculty_id: 21,
        section: "B",
        start_time: "11:00",
        end_time: "12:00",
      })
    ).toBeNull();
  });
});

describe("loadOccurrencesForDate — exception-aware occupancy", () => {
  const monday = new Date(Date.UTC(2026, 9, 12));
  const tuesday = new Date(Date.UTC(2026, 9, 13));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("CANCELLED removes occupancy so the room is free", async () => {
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 200,
          room: "Lab 2",
          start_time: "10:00",
          end_time: "11:00",
          day_of_week: 1,
        }),
        exceptions: [{ exception_type: "CANCELLED", original_date: monday, timetable_id: 200 }],
      },
    ]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);

    const occurrences = await loadOccurrencesForDate(mockPrisma, monday);
    expect(occurrences).toEqual([]);
  });

  test("FACULTY_SUBSTITUTION occupies replacement faculty and frees the original", async () => {
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        ...createdSlot({
          timetable_id: 100,
          faculty_id: 20,
          day_of_week: 1,
          faculty: { faculty_id: 20, full_name: "Original" },
        }),
        exceptions: [
          {
            exception_type: "FACULTY_SUBSTITUTION",
            original_date: monday,
            timetable_id: 100,
            replacement_faculty_id: 21,
          },
        ],
      },
    ]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);

    const occurrences = await loadOccurrencesForDate(mockPrisma, monday);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].faculty_id).toBe(21);
    expect(occurrences[0].faculty).toBeNull();
  });

  test("RESCHEDULED outbound frees the original date and inbound occupies the destination", async () => {
    const slot = createdSlot({
      timetable_id: 100,
      day_of_week: 1,
      room: "CSE-301",
      start_time: "10:00",
      end_time: "11:00",
    });
    const exception = {
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: tuesday,
      timetable_id: 100,
      room: "Hall 9",
      start_time: "15:00",
      end_time: "16:00",
      timetable: slot,
    };

    mockPrisma.timetableSlot.findMany.mockResolvedValueOnce([{ ...slot, exceptions: [exception] }]);
    mockPrisma.timetableException.findMany.mockResolvedValueOnce([]);

    const mondayOccurrences = await loadOccurrencesForDate(mockPrisma, monday);
    expect(mondayOccurrences).toEqual([]);

    mockPrisma.timetableSlot.findMany.mockResolvedValueOnce([]); // Tuesday weekly filter excludes Monday slot
    mockPrisma.timetableException.findMany.mockResolvedValueOnce([exception]);

    const tuesdayOccurrences = await loadOccurrencesForDate(mockPrisma, tuesday);
    expect(tuesdayOccurrences).toHaveLength(1);
    expect(tuesdayOccurrences[0]).toEqual(
      expect.objectContaining({
        timetable_id: 100,
        room: "Hall 9",
        start_time: "15:00",
        end_time: "16:00",
        exception_type: "RESCHEDULED",
        date: "2026-10-13",
      })
    );
  });

  test("does not duplicate a same-weekday RESCHEDULED destination", async () => {
    const nextMonday = new Date(Date.UTC(2026, 9, 19));
    const slot = createdSlot({ timetable_id: 100, day_of_week: 1, room: "CSE-301" });
    const exception = {
      exception_type: "RESCHEDULED",
      original_date: monday,
      rescheduled_date: nextMonday,
      timetable_id: 100,
      room: "Hall 9",
      timetable: slot,
    };

    mockPrisma.timetableSlot.findMany.mockResolvedValue([{ ...slot, exceptions: [exception] }]);
    mockPrisma.timetableException.findMany.mockResolvedValue([exception]);

    const occurrences = await loadOccurrencesForDate(mockPrisma, nextMonday);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].timetable_id).toBe(100);
    expect(occurrences[0].room).toBe("Hall 9");
  });
});

describe("Timetable read authorization — exceptions and effective", () => {
  const monday = new Date(Date.UTC(2026, 9, 12));
  const ownSlot = createdSlot({
    timetable_id: 100,
    dept_id: 30,
    semester: 5,
    section: "A",
  });
  const otherSectionSlot = createdSlot({
    timetable_id: 200,
    dept_id: 30,
    semester: 5,
    section: "B",
  });
  const otherDeptSlot = createdSlot({
    timetable_id: 300,
    dept_id: 99,
    semester: 5,
    section: "A",
  });
  const ownException = {
    timetable_exception_id: 501,
    timetable_id: 100,
    exception_type: "CANCELLED",
    original_date: monday,
    reason: "Holiday",
    replacement_faculty_id: null,
    timetable: ownSlot,
    replacement_faculty: null,
  };
  const otherSectionException = {
    ...ownException,
    timetable_exception_id: 502,
    timetable_id: 200,
    timetable: otherSectionSlot,
  };
  const otherDeptException = {
    ...ownException,
    timetable_exception_id: 503,
    timetable_id: 300,
    timetable: otherDeptSlot,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listTimetableExceptions allows STUDENT for their own section slot", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(ownSlot);
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });
    mockPrisma.timetableException.findMany.mockResolvedValue([ownException]);

    const result = await listTimetableExceptions(100, ADMIN_USER_ID);

    expect(result).toEqual([ownException]);
    expect(result.every((entry) => entry.timetable_id === 100)).toBe(true);
    expect(mockPrisma.timetableException.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { timetable_id: 100 },
        include: {
          replacement_faculty: {
            select: { faculty_id: true, full_name: true },
          },
        },
      })
    );
  });

  test("listTimetableExceptions denies STUDENT for another section", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(otherSectionSlot);
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    await expectStatus(listTimetableExceptions(200, ADMIN_USER_ID), 403);
    expect(mockPrisma.timetableException.findMany).not.toHaveBeenCalled();
  });

  test("listTimetableExceptions denies FACULTY for another department", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(otherDeptSlot);
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));

    await expectStatus(listTimetableExceptions(300, ADMIN_USER_ID), 403);
    expect(mockPrisma.timetableException.findMany).not.toHaveBeenCalled();
  });

  test("getTimetableExceptionById denies STUDENT for another section exception", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.timetableException.findUnique.mockResolvedValue(otherSectionException);
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    await expectStatus(getTimetableExceptionById(502, ADMIN_USER_ID), 403);
  });

  test("getTimetableExceptionById denies FACULTY for another department exception", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.timetableException.findUnique.mockResolvedValue(otherDeptException);
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));

    await expectStatus(getTimetableExceptionById(503, ADMIN_USER_ID), 403);
  });

  test("getTimetableExceptionById allows FACULTY in the same department and returns owned slot", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.timetableException.findUnique.mockResolvedValue(ownException);
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));

    const result = await getTimetableExceptionById(501, ADMIN_USER_ID);

    expect(result.timetable_exception_id).toBe(501);
    expect(result.timetable.dept_id).toBe(30);
    expect(JSON.stringify(result)).not.toMatch(SENSITIVE_FIELD_PATTERN);
  });

  test("getTimetableExceptionById returns 404 for missing profile", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.timetableException.findUnique.mockResolvedValue(ownException);
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(getTimetableExceptionById(501, ADMIN_USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Student profile not found",
    });
  });

  test("getEffectiveTimetable student identity ignores client scope and returns own records", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      { ...ownSlot, day_of_week: 1, exceptions: [] },
      { ...otherSectionSlot, day_of_week: 1, exceptions: [] },
    ]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);

    const result = await getEffectiveTimetable(ADMIN_USER_ID, { date: monday });

    expect(result.every((entry) => entry.dept_id === 30 && entry.section === "A")).toBe(true);
    expect(result.some((entry) => entry.timetable_id === 100)).toBe(true);
    expect(result.some((entry) => entry.timetable_id === 200)).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(SENSITIVE_FIELD_PATTERN);
  });

  test("getEffectiveTimetable faculty cannot open another department via query scope", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));
    mockPrisma.timetableSlot.findMany.mockResolvedValue([]);
    mockPrisma.timetableException.findMany.mockResolvedValue([]);

    await expectStatus(
      getEffectiveTimetable(ADMIN_USER_ID, {
        date: monday,
        dept_id: 99,
        semester: 5,
        section: "A",
      }),
      403
    );
  });

  test("getTimetable read include never requests password or reset fields", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser());
    mockPrisma.timetableSlot.findMany.mockResolvedValue([ownSlot]);

    await getTimetable(30, 5, "A", ADMIN_USER_ID);

    expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
      where: { dept_id: 30, semester: 5, section: "A" },
      include: TIMETABLE_SLOT_READ_INCLUDE,
      orderBy: [{ day_of_week: "asc" }, { period: "asc" }],
    });
    expect(JSON.stringify(TIMETABLE_SLOT_READ_INCLUDE)).not.toMatch(SENSITIVE_FIELD_PATTERN);
    expect(TIMETABLE_SLOT_READ_INCLUDE.faculty.select).toEqual({
      faculty_id: true,
      full_name: true,
    });
  });
});

describe("Timetable controllers — read authorization surface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getEffectiveTimetableController uses req.user.userId and rejects other-section scope", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    const req = {
      user: { userId: ADMIN_USER_ID },
      query: {
        date: "2026-10-12",
        dept_id: "30",
        semester: "5",
        section: "B",
        user_id: "999",
      },
    };
    const res = mockResponse();

    await getEffectiveTimetableController(req, res);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { user_id: ADMIN_USER_ID },
      select: { user_id: true, role: true },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });

  test("listTimetableExceptionsController maps other-section denial to 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "STUDENT" }));
    mockPrisma.timetableSlot.findUnique.mockResolvedValue(
      createdSlot({ timetable_id: 200, section: "B" })
    );
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: ADMIN_USER_ID,
      dept_id: 30,
      semester: 5,
      section: "A",
    });

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { timetable_id: "200" },
      query: { user_id: "999" },
    };
    const res = mockResponse();

    await listTimetableExceptionsController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockPrisma.timetableException.findMany).not.toHaveBeenCalled();
  });

  test("getTimetableExceptionController maps other-dept faculty denial to 403", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser({ role: "FACULTY" }));
    mockPrisma.timetableException.findUnique.mockResolvedValue({
      timetable_exception_id: 503,
      timetable: createdSlot({ dept_id: 99 }),
    });
    mockPrisma.faculty.findUnique.mockResolvedValue(facultyRecord({ dept_id: 30 }));

    const req = {
      user: { userId: ADMIN_USER_ID },
      params: { exception_id: "503" },
      query: { faculty_id: "20", dept_id: "99" },
    };
    const res = mockResponse();

    await getTimetableExceptionController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(SENSITIVE_FIELD_PATTERN);
  });
});
