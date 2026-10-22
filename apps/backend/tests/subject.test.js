import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  createSubjectSchema,
  updateSubjectSchema,
} from "../src/validators/subject.validator.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
  },
  subject: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  timetableSlot: {
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

const { createSubject, updateSubject } = await import("../src/services/subject.service.js");

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("Subject management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updateSubjectSchema requires at least one field", () => {
    expect(updateSubjectSchema.safeParse({}).success).toBe(false);
    expect(updateSubjectSchema.safeParse({ is_active: false }).success).toBe(true);
  });

  test("createSubjectSchema still requires core fields", () => {
    expect(createSubjectSchema.safeParse({ subject_code: "CS" }).success).toBe(false);
  });

  test("createSubject returns subject_id and subjectId", async () => {
    mockPrisma.subject.findUnique.mockResolvedValue(null);
    mockPrisma.department.findUnique.mockResolvedValue({ dept_id: 80 });
    mockPrisma.subject.create.mockResolvedValue({
      subject_id: 4,
      subject_code: "CS501",
      subject_name: "Networks",
      dept_id: 80,
      semester: 5,
      credits: 3,
      is_active: true,
    });

    const result = await createSubject({
      subject_code: "CS501",
      subject_name: "Networks",
      dept_id: 80,
      semester: 5,
      credits: 3,
      is_active: true,
    });

    expect(result.subject_id).toBe(4);
    expect(result.subjectId).toBe(4);
  });

  test("updateSubject deactivates a subject", async () => {
    mockPrisma.subject.findUnique.mockResolvedValue({
      subject_id: 4,
      subject_code: "CS501",
    });
    mockPrisma.subject.update.mockResolvedValue({
      subject_id: 4,
      subject_code: "CS501",
      subject_name: "Networks",
      dept_id: 80,
      semester: 5,
      credits: 3,
      is_active: false,
    });

    const result = await updateSubject(4, { is_active: false });
    expect(mockPrisma.subject.update).toHaveBeenCalledWith({
      where: { subject_id: 4 },
      data: { is_active: false },
    });
    expect(result.is_active).toBe(false);
  });

  test("updateSubject rejects a duplicate code", async () => {
    mockPrisma.subject.findUnique
      .mockResolvedValueOnce({ subject_id: 4, subject_code: "CS501" })
      .mockResolvedValueOnce({ subject_id: 9, subject_code: "CS502" });

    await expectStatus(updateSubject(4, { subject_code: "CS502" }), 409);
  });
});
