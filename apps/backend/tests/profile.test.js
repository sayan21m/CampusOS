import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { updatePreferencesSchema, validateProfilePhoto } from "../src/validators/profile.validator.js";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notificationPreference: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  activityLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(async (ops) => {
    if (typeof ops === "function") {
      return ops(mockPrisma);
    }
    return Promise.all(ops);
  }),
};

jest.unstable_mockModule("../src/config/db.js", () => ({
  default: mockPrisma,
}));

const {
  getMyProfile,
  listEmailPreferences,
  updateEmailPreferences,
} = await import("../src/services/profile.service.js");

describe("Profile module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.activityLog.create.mockResolvedValue({});
  });

  test("student profile includes photo_url from the user record", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      user_id: 3,
      email: "ada@test.com",
      role: "STUDENT",
      isActive: true,
      lastLogin: null,
      photo_url: "photos/user-3/a.png",
    });
    mockPrisma.student.findUnique.mockResolvedValue({
      student_id: 1,
      user_id: 3,
      roll_number: "CS001",
      full_name: "Ada",
      semester: 5,
      section: "A",
      admission_year: 2023,
      phone: null,
      photo_url: null,
      department: { dept_id: 1, dept_name: "CSE", dept_code: "CS" },
    });

    const profile = await getMyProfile(3);
    expect(profile.photo_url).toBe("photos/user-3/a.png");
    expect(profile.role).toBe("STUDENT");
  });

  test("admin profile is available", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      user_id: 1,
      name: "Root",
      email: "admin@test.com",
      role: "ADMIN",
      isActive: true,
      lastLogin: null,
      photo_url: null,
    });

    const profile = await getMyProfile(1);
    expect(profile.role).toBe("ADMIN");
    expect(profile.email).toBe("admin@test.com");
  });

  test("listEmailPreferences fills defaults when none stored", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3 });
    mockPrisma.notificationPreference.findMany.mockResolvedValue([]);

    const prefs = await listEmailPreferences(3);
    expect(prefs).toHaveLength(5);
    expect(prefs.every((item) => item.email_enabled === true)).toBe(true);
  });

  test("updateEmailPreferences upserts each category", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 3 });
    mockPrisma.notificationPreference.upsert.mockResolvedValue({});
    mockPrisma.notificationPreference.findMany.mockResolvedValue([
      { category: "NOTICES", email_enabled: false, updated_at: new Date() },
    ]);

    const prefs = await updateEmailPreferences(3, [
      { category: "NOTICES", email_enabled: false },
    ]);

    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalled();
    expect(prefs.find((item) => item.category === "NOTICES").email_enabled).toBe(false);
  });

  test("preference schema rejects unknown categories", () => {
    const result = updatePreferencesSchema.safeParse({
      preferences: [{ category: "SPAM", email_enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  test("photo validator rejects non-images", () => {
    const result = validateProfilePhoto({
      originalname: "notes.pdf",
      mimetype: "application/pdf",
      size: 100,
    });
    expect(result.success).toBe(false);
  });
});
