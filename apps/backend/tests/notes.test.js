import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  notesMetadataSchema,
  replaceNotesSchema,
  validateNotesFile,
} from "../src/validators/notes.validator.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  subject: {
    findUnique: jest.fn(),
  },
  timetableSlot: {
    findFirst: jest.fn(),
  },
  facultySubjectAllocation: {
    findUnique: jest.fn(),
  },
  notes: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockSaveNotesFile = jest.fn();
const mockDeleteNotesFile = jest.fn();
const mockFsStat = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("../src/services/notes-storage.service.js", () => ({
  saveNotesFile: mockSaveNotesFile,
  deleteNotesFile: mockDeleteNotesFile,
}));

jest.unstable_mockModule("node:fs/promises", () => ({
  default: {
    stat: mockFsStat,
  },
  stat: mockFsStat,
}));

const {
  createNotes,
  getNotes,
  getAccessibleNote,
  replaceNotes,
  deleteNotes,
} = await import("../src/services/notes.service.js");
const {
  createNotesController,
  getNotesController,
  deleteNotesController,
  replaceNotesController,
} = await import("../src/controllers/notes.controller.js");

function pdfFile(overrides = {}) {
  return {
    originalname: "unit3-notes.pdf",
    mimetype: "application/pdf",
    size: 2048,
    buffer: Buffer.from("%PDF-1.4 test"),
    ...overrides,
  };
}

function baseMetadata(overrides = {}) {
  return {
    subject_id: 10,
    title: "Unit 3 Lecture Notes",
    description: "Sorting algorithms",
    unit_number: 3,
    material_type: "LECTURE_NOTES",
    academic_year: 2026,
    ...overrides,
  };
}

function createdNote(overrides = {}) {
  return {
    notes_id: 1,
    subject_id: 10,
    uploaded_by: 20,
    title: "Unit 3 Lecture Notes",
    description: "Sorting algorithms",
    unit_number: 3,
    material_type: "LECTURE_NOTES",
    academic_year: 2026,
    file_size_bytes: 2048n,
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

async function expectStatus(promise, statusCode) {
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("Notes validators", () => {
  test("accepts valid metadata", () => {
    const result = notesMetadataSchema.safeParse(baseMetadata());
    expect(result.success).toBe(true);
  });

  test("rejects invalid material type", () => {
    const result = notesMetadataSchema.safeParse(
      baseMetadata({ material_type: "WHATSAPP_FORWARD" })
    );
    expect(result.success).toBe(false);
  });

  test("replace schema allows partial updates without subject_id", () => {
    const result = replaceNotesSchema.safeParse({ title: "Updated title" });
    expect(result.success).toBe(true);
  });

  test("validateNotesFile rejects missing file", () => {
    expect(validateNotesFile(null)).toEqual({
      success: false,
      message: "A material file is required",
    });
  });

  test("validateNotesFile rejects oversized files", () => {
    expect(validateNotesFile(pdfFile({ size: 26 * 1024 * 1024 }))).toEqual({
      success: false,
      message: "File size must not exceed 25 MB",
    });
  });

  test("validateNotesFile rejects unsupported extensions", () => {
    expect(
      validateNotesFile(
        pdfFile({
          originalname: "notes.exe",
          mimetype: "application/octet-stream",
        })
      )
    ).toEqual({
      success: false,
      message: "Unsupported file extension",
    });
  });

  test("validateNotesFile accepts PDF", () => {
    expect(validateNotesFile(pdfFile())).toEqual({ success: true });
  });
});

describe("Notes service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.facultySubjectAllocation.findUnique.mockResolvedValue(null);
    mockSaveNotesFile.mockResolvedValue({
      filename: "abc.pdf",
      originalName: "unit3-notes.pdf",
      mimeType: "application/pdf",
      size: 2048,
      path: "notes/notes-10-2026-20/unit-3/abc.pdf",
    });
    mockDeleteNotesFile.mockResolvedValue(undefined);
    mockFsStat.mockResolvedValue({ isFile: () => true });
  });

  describe("createNotes()", () => {
    test("faculty uploads material for an allotted subject", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        user_id: 2,
        dept_id: 5,
      });
      mockPrisma.subject.findUnique.mockResolvedValue({
        subject_id: 10,
        dept_id: 5,
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 99 });
      mockPrisma.notes.create.mockResolvedValue(createdNote());

      const result = await createNotes(2, baseMetadata(), pdfFile());

      expect(mockSaveNotesFile).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_id: 10,
          academic_year: 2026,
          unit_number: 3,
          faculty_id: 20,
        })
      );
      expect(mockPrisma.notes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject_id: 10,
            uploaded_by: 20,
            storage_key: "notes/notes-10-2026-20/unit-3/abc.pdf",
            file_size_bytes: 2048n,
          }),
        })
      );
      expect(result.file_size_bytes).toBe("2048");
      expect(result.notes_id).toBe(1);
    });

    test("rejects when faculty profile is missing", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue(null);
      await expectStatus(createNotes(2, baseMetadata(), pdfFile()), 404);
      expect(mockSaveNotesFile).not.toHaveBeenCalled();
    });

    test("rejects when subject is missing", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.subject.findUnique.mockResolvedValue(null);
      await expectStatus(createNotes(2, baseMetadata(), pdfFile()), 404);
    });

    test("rejects cross-department upload", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.subject.findUnique.mockResolvedValue({
        subject_id: 10,
        dept_id: 9,
      });
      await expectStatus(createNotes(2, baseMetadata(), pdfFile()), 403);
      expect(mockSaveNotesFile).not.toHaveBeenCalled();
    });

    test("rejects when faculty is not allotted to the subject", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.subject.findUnique.mockResolvedValue({
        subject_id: 10,
        dept_id: 5,
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue(null);
      await expectStatus(createNotes(2, baseMetadata(), pdfFile()), 403);
      expect(mockSaveNotesFile).not.toHaveBeenCalled();
    });

    test("cleans up stored file if database create fails", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.subject.findUnique.mockResolvedValue({
        subject_id: 10,
        dept_id: 5,
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 99 });
      mockPrisma.notes.create.mockRejectedValue(new Error("db down"));

      await expect(createNotes(2, baseMetadata(), pdfFile())).rejects.toThrow("db down");
      expect(mockDeleteNotesFile).toHaveBeenCalledWith(
        "notes/notes-10-2026-20/unit-3/abc.pdf"
      );
    });
  });

  describe("getNotes()", () => {
    test("students list materials for their dept and semester", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3, role: "STUDENT" });
      mockPrisma.student.findUnique.mockResolvedValue({
        user_id: 3,
        dept_id: 5,
        semester: 5,
      });
      mockPrisma.notes.findMany.mockResolvedValue([createdNote()]);

      const result = await getNotes(3, "10", "3");

      expect(mockPrisma.notes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subject_id: 10,
            unit_number: 3,
            subject: {
              dept_id: 5,
              semester: 5,
              is_active: true,
            },
          }),
        })
      );
      expect(result[0].file_size_bytes).toBe("2048");
    });

    test("faculty list is scoped to their uploads", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        user_id: 2,
      });
      mockPrisma.notes.findMany.mockResolvedValue([createdNote()]);

      await getNotes(2, 10, 3);

      expect(mockPrisma.notes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            uploaded_by: 20,
            subject_id: 10,
            unit_number: 3,
          }),
        })
      );
    });

    test("rejects invalid subject id", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      await expectStatus(getNotes(2, "abc", 3), 400);
    });

    test("rejects admin role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      await expectStatus(getNotes(1, 10, 3), 403);
    });
  });

  describe("getAccessibleNote()", () => {
    test("allows allotted faculty to access a note file", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "FACULTY",
        isActive: true,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        storage_key: "notes/file.pdf",
        subject: { dept_id: 5, semester: 5, is_active: true },
      });
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 1 });

      const result = await getAccessibleNote(2, "1");

      expect(result.note.notes_id).toBe(1);
      expect(result.absolutePath).toContain("notes/file.pdf");
    });

    test("rejects student from another semester", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: "STUDENT",
        isActive: true,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        storage_key: "notes/file.pdf",
        subject: { dept_id: 5, semester: 5, is_active: true },
      });
      mockPrisma.student.findUnique.mockResolvedValue({
        dept_id: 5,
        semester: 3,
      });

      await expectStatus(getAccessibleNote(3, 1), 403);
    });
  });

  describe("replaceNotes()", () => {
    test("uploader replaces file and metadata", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        storage_key: "notes/old.pdf",
        subject: { dept_id: 5 },
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 1 });
      mockPrisma.notes.update.mockResolvedValue(
        createdNote({
          title: "Updated Notes",
          file_size_bytes: 4096n,
        })
      );
      mockSaveNotesFile.mockResolvedValue({
        path: "notes/new.pdf",
        size: 4096,
      });

      const result = await replaceNotes(
        2,
        "1",
        { title: "Updated Notes" },
        pdfFile({ size: 4096 })
      );

      expect(mockPrisma.notes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { notes_id: 1 },
          data: expect.objectContaining({
            title: "Updated Notes",
            storage_key: "notes/new.pdf",
            file_size_bytes: 4096n,
          }),
        })
      );
      expect(mockDeleteNotesFile).toHaveBeenCalledWith("notes/old.pdf");
      expect(result.title).toBe("Updated Notes");
      expect(result.file_size_bytes).toBe("4096");
    });

    test("rejects replace by non-owner faculty", async () => {
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 99,
        dept_id: 5,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        uploaded_by: 20,
        subject: { dept_id: 5 },
      });

      await expectStatus(
        replaceNotes(9, 1, { title: "Nope" }, pdfFile()),
        403
      );
      expect(mockSaveNotesFile).not.toHaveBeenCalled();
    });
  });

  describe("deleteNotes()", () => {
    test("uploader deletes material and file", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 20,
        dept_id: 5,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        storage_key: "notes/old.pdf",
        subject: { dept_id: 5 },
      });
      mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 1 });
      mockPrisma.notes.delete.mockResolvedValue(createdNote());

      const result = await deleteNotes(2, "1");

      expect(mockPrisma.notes.delete).toHaveBeenCalledWith({
        where: { notes_id: 1 },
      });
      expect(mockDeleteNotesFile).toHaveBeenCalledWith("notes/old.pdf");
      expect(result).toEqual({
        notes_id: 1,
        message: "Material deleted successfully",
      });
    });

    test("rejects invalid material id", async () => {
      await expectStatus(deleteNotes(2, "abc"), 400);
    });

    test("rejects delete by non-owner", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ user_id: 9, role: "FACULTY" });
      mockPrisma.faculty.findUnique.mockResolvedValue({
        faculty_id: 99,
        dept_id: 5,
      });
      mockPrisma.notes.findUnique.mockResolvedValue({
        ...createdNote(),
        uploaded_by: 20,
        subject: { dept_id: 5 },
      });

      await expectStatus(deleteNotes(9, 1), 403);
      expect(mockPrisma.notes.delete).not.toHaveBeenCalled();
    });
  });
});

describe("Notes controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.facultySubjectAllocation.findUnique.mockResolvedValue(null);
  });

  test("createNotesController returns 400 for invalid file", async () => {
    const req = {
      user: { userId: 2 },
      body: baseMetadata(),
      file: null,
    };
    const res = mockResponse();

    await createNotesController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "A material file is required",
    });
  });

  test("getNotesController returns materials list", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 2, role: "FACULTY" });
    mockPrisma.faculty.findUnique.mockResolvedValue({ faculty_id: 20 });
    mockPrisma.notes.findMany.mockResolvedValue([createdNote()]);

    const req = {
      user: { userId: 2 },
      params: { subject_id: "10", unit_number: "3" },
    };
    const res = mockResponse();

    await getNotesController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Materials retrieved successfully",
        count: 1,
      })
    );
  });

  test("deleteNotesController maps service errors", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 2 },
      params: { id: "1" },
    };
    const res = mockResponse();

    await deleteNotesController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "User not found",
    });
  });

  test("replaceNotesController returns 200 on success", async () => {
    mockPrisma.faculty.findUnique.mockResolvedValue({
      faculty_id: 20,
      dept_id: 5,
    });
    mockPrisma.notes.findUnique.mockResolvedValue({
      ...createdNote(),
      storage_key: "notes/old.pdf",
      subject: { dept_id: 5 },
    });
    mockPrisma.timetableSlot.findFirst.mockResolvedValue({ timetable_id: 1 });
    mockPrisma.notes.update.mockResolvedValue(createdNote({ title: "Replaced" }));
    mockSaveNotesFile.mockResolvedValue({
      path: "notes/new.pdf",
      size: 2048,
    });

    const req = {
      user: { userId: 2 },
      params: { notes_id: "1" },
      body: { title: "Replaced" },
      file: pdfFile(),
    };
    const res = mockResponse();

    await replaceNotesController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Material replaced successfully",
      })
    );
  });
});
