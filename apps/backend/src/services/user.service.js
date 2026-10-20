import prisma from "../config/db.js";
import { hashPassword } from "../utils/password.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function mapUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    student: user.student
      ? {
          student_id: user.student.student_id,
          roll_number: user.student.roll_number,
          full_name: user.student.full_name,
          dept_id: user.student.dept_id,
          semester: user.student.semester,
          section: user.student.section,
          admission_year: user.student.admission_year,
          phone: user.student.phone,
          department: user.student.department || undefined,
        }
      : null,
    faculty: user.faculty
      ? {
          faculty_id: user.faculty.faculty_id,
          employee_id: user.faculty.employee_id,
          full_name: user.faculty.full_name,
          dept_id: user.faculty.dept_id,
          designation: user.faculty.designation,
          phone: user.faculty.phone,
          department: user.faculty.department || undefined,
        }
      : null,
  };
}

const USER_LIST_INCLUDE = {
  student: {
    include: {
      department: {
        select: { dept_id: true, dept_name: true, dept_code: true },
      },
    },
  },
  faculty: {
    include: {
      department: {
        select: { dept_id: true, dept_name: true, dept_code: true },
      },
    },
  },
};

export async function listUsers({ role, isActive, search } = {}) {
  const where = {};

  if (role) {
    where.role = role;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { student: { roll_number: { contains: search, mode: "insensitive" } } },
      { faculty: { employee_id: { contains: search, mode: "insensitive" } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: USER_LIST_INCLUDE,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return users.map(mapUser);
}

export async function getUserById(userId) {
  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid user ID", 400);
  }

  const user = await prisma.user.findUnique({
    where: { user_id: parsedId },
    include: USER_LIST_INCLUDE,
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  return mapUser(user);
}

export async function createUserWithProfile(payload) {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existing) {
    throw createError("Email already exists", 409);
  }

  const department = await prisma.department.findUnique({
    where: { dept_id: payload.dept_id },
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  const passwordHash = await hashPassword(payload.password);
  const fullName = payload.full_name || payload.name;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: payload.role,
        isActive: true,
      },
    });

    if (payload.role === "STUDENT") {
      const rollExists = await tx.student.findUnique({
        where: { roll_number: payload.roll_number },
      });
      if (rollExists) {
        throw createError("Roll number already exists", 409);
      }

      await tx.student.create({
        data: {
          user_id: user.user_id,
          roll_number: payload.roll_number,
          full_name: fullName,
          dept_id: payload.dept_id,
          semester: payload.semester,
          section: payload.section,
          admission_year: payload.admission_year,
          phone: payload.phone,
        },
      });
    }

    if (payload.role === "FACULTY") {
      const employeeExists = await tx.faculty.findUnique({
        where: { employee_id: payload.employee_id },
      });
      if (employeeExists) {
        throw createError("Employee ID already exists", 409);
      }

      await tx.faculty.create({
        data: {
          user_id: user.user_id,
          employee_id: payload.employee_id,
          full_name: fullName,
          dept_id: payload.dept_id,
          designation: payload.designation,
          phone: payload.phone,
        },
      });
    }

    const created = await tx.user.findUnique({
      where: { user_id: user.user_id },
      include: USER_LIST_INCLUDE,
    });

    return mapUser(created);
  });
}

export async function updateUser(userId, patch) {
  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid user ID", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { user_id: parsedId },
    include: { student: true, faculty: true },
  });

  if (!existing) {
    throw createError("User not found", 404);
  }

  if (patch.email && patch.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: patch.email } });
    if (emailTaken) {
      throw createError("Email already exists", 409);
    }
  }

  if (patch.dept_id !== undefined) {
    const department = await prisma.department.findUnique({
      where: { dept_id: patch.dept_id },
    });
    if (!department) {
      throw createError("Department not found", 404);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (patch.name !== undefined || patch.email !== undefined) {
      await tx.user.update({
        where: { user_id: parsedId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
        },
      });
    }

    if (existing.role === "STUDENT" && existing.student) {
      if (patch.roll_number && patch.roll_number !== existing.student.roll_number) {
        const rollTaken = await tx.student.findUnique({
          where: { roll_number: patch.roll_number },
        });
        if (rollTaken) {
          throw createError("Roll number already exists", 409);
        }
      }

      const studentData = {};
      for (const key of [
        "full_name",
        "dept_id",
        "semester",
        "section",
        "admission_year",
        "phone",
        "roll_number",
      ]) {
        if (patch[key] !== undefined) {
          studentData[key] = patch[key];
        }
      }

      if (Object.keys(studentData).length > 0) {
        await tx.student.update({
          where: { student_id: existing.student.student_id },
          data: studentData,
        });
      }
    }

    if (existing.role === "FACULTY" && existing.faculty) {
      if (patch.employee_id && patch.employee_id !== existing.faculty.employee_id) {
        const employeeTaken = await tx.faculty.findUnique({
          where: { employee_id: patch.employee_id },
        });
        if (employeeTaken) {
          throw createError("Employee ID already exists", 409);
        }
      }

      const facultyData = {};
      for (const key of ["full_name", "dept_id", "designation", "phone", "employee_id"]) {
        if (patch[key] !== undefined) {
          facultyData[key] = patch[key];
        }
      }

      if (Object.keys(facultyData).length > 0) {
        await tx.faculty.update({
          where: { faculty_id: existing.faculty.faculty_id },
          data: facultyData,
        });
      }
    }

    const updated = await tx.user.findUnique({
      where: { user_id: parsedId },
      include: USER_LIST_INCLUDE,
    });

    return mapUser(updated);
  });
}

export async function setUserActive(userId, isActive) {
  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid user ID", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { user_id: parsedId },
  });

  if (!existing) {
    throw createError("User not found", 404);
  }

  if (existing.role === "ADMIN" && isActive === false) {
    throw createError("Admin accounts cannot be deactivated from this endpoint", 403);
  }

  const updated = await prisma.user.update({
    where: { user_id: parsedId },
    data: {
      isActive,
      ...(isActive
        ? { failedLoginAttempts: 0, lockedUntil: null }
        : {}),
    },
    include: USER_LIST_INCLUDE,
  });

  return mapUser(updated);
}

export async function adminResetPassword(userId, newPassword) {
  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid user ID", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { user_id: parsedId },
  });

  if (!existing) {
    throw createError("User not found", 404);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { user_id: parsedId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return {
    user_id: parsedId,
    message: "Password reset successfully",
  };
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export async function bulkCreateUsersFromCsv(csvText) {
  if (!csvText || !String(csvText).trim()) {
    throw createError("CSV content is required", 400);
  }

  const lines = String(csvText)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw createError("CSV must include a header row and at least one data row", 400);
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const required = ["role", "name", "email", "password", "dept_id"];
  for (const field of required) {
    if (!headers.includes(field)) {
      throw createError(`CSV is missing required column: ${field}`, 400);
    }
  }

  const created = [];
  const failed = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });

    try {
      const role = String(row.role || "").trim().toUpperCase();
      const payload = {
        name: row.name,
        email: row.email,
        password: row.password,
        role,
        dept_id: Number(row.dept_id),
        full_name: row.full_name || row.name,
        phone: row.phone || undefined,
        roll_number: row.roll_number || undefined,
        semester: row.semester ? Number(row.semester) : undefined,
        section: row.section || undefined,
        admission_year: row.admission_year ? Number(row.admission_year) : undefined,
        employee_id: row.employee_id || undefined,
        designation: row.designation || undefined,
      };

      if (role !== "STUDENT" && role !== "FACULTY") {
        throw createError("role must be STUDENT or FACULTY", 400);
      }

      if (role === "STUDENT") {
        if (!payload.roll_number || !payload.semester || !payload.section || !payload.admission_year) {
          throw createError(
            "STUDENT rows require roll_number, semester, section, admission_year",
            400
          );
        }
      }

      if (role === "FACULTY") {
        if (!payload.employee_id || !payload.designation) {
          throw createError("FACULTY rows require employee_id and designation", 400);
        }
      }

      const user = await createUserWithProfile(payload);
      created.push({ row: index + 1, user_id: user.user_id, email: user.email });
    } catch (error) {
      failed.push({
        row: index + 1,
        email: row.email || null,
        message: error.message || "Failed to create user",
      });
    }
  }

  return {
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed,
  };
}
