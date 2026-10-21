import prisma from "../config/db.js";
import {
  EMAIL_CATEGORIES,
} from "../validators/profile.validator.js";
import {
  deleteStoredFile,
  resolveStoredPath,
  saveStoredFile,
} from "./file-storage.service.js";
import { ACTIVITY_ACTIONS, listActivity, logActivity } from "./activity.service.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function defaultPreferences() {
  return EMAIL_CATEGORIES.map((category) => ({
    category,
    email_enabled: true,
  }));
}

export async function getMyProfile(userId) {
  const user = await prisma.user.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const role = user.role;

  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        department: {
          select: {
            dept_id: true,
            dept_name: true,
            dept_code: true,
          },
        },
      },
    });

    if (!student) {
      throw createError("Student not found", 404);
    }

    return {
      studentId: student.student_id,
      userId: student.user_id,
      roll_number: student.roll_number,
      full_name: student.full_name,
      email: user.email,
      role: user.role,
      accountStatus: user.isActive,
      department: student.department,
      semester: student.semester,
      section: student.section,
      admission_year: student.admission_year,
      phone: student.phone,
      photo_url: user.photo_url || student.photo_url,
      lastLogin: user.lastLogin,
    };
  } else if (role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        department: {
          select: {
            dept_id: true,
            dept_name: true,
            dept_code: true,
          },
        },
      },
    });

    if (!faculty) {
      throw createError("Faculty not found", 404);
    }

    return {
      facultyId: faculty.faculty_id,
      userId: faculty.user_id,
      employeeId: faculty.employee_id,
      full_name: faculty.full_name,
      email: user.email,
      role: user.role,
      accountStatus: user.isActive,
      department: faculty.department,
      designation: faculty.designation,
      phone: faculty.phone,
      photo_url: user.photo_url || faculty.photo_url,
      lastLogin: user.lastLogin,
    };
  } else if (role === "ADMIN") {
    return {
      userId: user.user_id,
      full_name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.isActive,
      photo_url: user.photo_url,
      lastLogin: user.lastLogin,
    };
  } else {
    throw createError("Profile not available", 404);
  }
}

export async function listEmailPreferences(userId) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const rows = await prisma.notificationPreference.findMany({
    where: { user_id: userId },
    select: {
      category: true,
      email_enabled: true,
      updated_at: true,
    },
  });

  const byCategory = new Map(rows.map((row) => [row.category, row]));

  return defaultPreferences().map((item) => {
    const stored = byCategory.get(item.category);
    return {
      category: item.category,
      email_enabled: stored ? stored.email_enabled : true,
    };
  });
}

export async function updateEmailPreferences(userId, preferences) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const unique = new Map();
  for (const item of preferences) {
    unique.set(item.category, Boolean(item.email_enabled));
  }

  await prisma.$transaction(
    [...unique.entries()].map(([category, email_enabled]) =>
      prisma.notificationPreference.upsert({
        where: {
          user_id_category: {
            user_id: userId,
            category,
          },
        },
        create: {
          user_id: userId,
          category,
          email_enabled,
        },
        update: {
          email_enabled,
        },
      })
    )
  );

  await logActivity(
    userId,
    ACTIVITY_ACTIONS.PREFERENCE_UPDATE,
    [...unique.entries()]
      .map(([category, enabled]) => `${category}:${enabled ? "on" : "off"}`)
      .join(", ")
  );

  return listEmailPreferences(userId);
}

export async function listMyActivity(userId, query = {}) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  return listActivity(userId, query);
}

export async function saveProfilePhoto(userId, file) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      student: { select: { student_id: true } },
      faculty: { select: { faculty_id: true } },
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const saved = await saveStoredFile({
    file,
    directory: `photos/user-${userId}`,
  });

  const previous = user.photo_url;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { user_id: userId },
      data: { photo_url: saved.path },
    });

    if (user.student) {
      await tx.student.update({
        where: { student_id: user.student.student_id },
        data: { photo_url: saved.path },
      });
    }

    if (user.faculty) {
      await tx.faculty.update({
        where: { faculty_id: user.faculty.faculty_id },
        data: { photo_url: saved.path },
      });
    }
  });

  if (previous && previous !== saved.path) {
    await deleteStoredFile(previous);
  }

  await logActivity(userId, ACTIVITY_ACTIONS.PHOTO_UPLOAD, saved.originalName);

  return {
    photo_url: saved.path,
    has_photo: true,
  };
}

export async function getProfilePhoto(userId) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      student: { select: { photo_url: true } },
      faculty: { select: { photo_url: true } },
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const storageKey = user.photo_url || user.student?.photo_url || user.faculty?.photo_url;
  if (!storageKey) {
    throw createError("Profile photo not found", 404);
  }

  return {
    absolutePath: resolveStoredPath(storageKey),
    storageKey,
  };
}
