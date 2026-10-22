import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function getMySubjects(userId) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw createError("User not found or inactive", 403);
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      select: { dept_id: true, semester: true },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    return prisma.subject.findMany({
      where: {
        dept_id: student.dept_id,
        semester: student.semester,
        is_active: true,
      },
      orderBy: [{ subject_code: "asc" }],
      select: {
        subject_id: true,
        subject_code: true,
        subject_name: true,
        dept_id: true,
        semester: true,
        credits: true,
        is_active: true,
      },
    });
  }

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
      select: { faculty_id: true, dept_id: true },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    const allotments = await prisma.timetableSlot.findMany({
      where: { faculty_id: faculty.faculty_id },
      select: { subject_id: true },
      distinct: ["subject_id"],
    });

    const subjectIds = allotments.map((row) => row.subject_id);

    if (subjectIds.length === 0) {
      return [];
    }

    return prisma.subject.findMany({
      where: {
        subject_id: { in: subjectIds },
        is_active: true,
      },
      orderBy: [{ subject_code: "asc" }],
      select: {
        subject_id: true,
        subject_code: true,
        subject_name: true,
        dept_id: true,
        semester: true,
        credits: true,
        is_active: true,
      },
    });
  }

  if (user.role === "ADMIN") {
    return prisma.subject.findMany({
      orderBy: [{ is_active: "desc" }, { subject_code: "asc" }],
      select: {
        subject_id: true,
        subject_code: true,
        subject_name: true,
        dept_id: true,
        semester: true,
        credits: true,
        is_active: true,
      },
    });
  }

  throw createError("Permission denied", 403);
}

export async function createSubject(subjectData) {
  const { subject_code, subject_name, dept_id, semester, credits, is_active } = subjectData;

  const existingSubject = await prisma.subject.findUnique({
    where: {
      subject_code,
    },
  });

  if (existingSubject) {
    throw createError("Subject code already exists", 409);
  }

  const department = await prisma.department.findUnique({
    where: {
      dept_id,
    },
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  const subject = await prisma.subject.create({
    data: {
      subject_code,
      subject_name,
      dept_id,
      semester,
      credits,
      is_active,
    },
  });

  return mapSubject(subject);
}

function mapSubject(subject) {
  return {
    subject_id: subject.subject_id,
    subjectId: subject.subject_id,
    subject_code: subject.subject_code,
    subject_name: subject.subject_name,
    dept_id: subject.dept_id,
    semester: subject.semester,
    credits: subject.credits,
    is_active: subject.is_active,
  };
}

export async function updateSubject(subjectId, patch) {
  const parsedId = Number(subjectId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid subject ID", 400);
  }

  const existing = await prisma.subject.findUnique({
    where: { subject_id: parsedId },
  });

  if (!existing) {
    throw createError("Subject not found", 404);
  }

  if (patch.subject_code && patch.subject_code !== existing.subject_code) {
    const codeTaken = await prisma.subject.findUnique({
      where: { subject_code: patch.subject_code },
    });
    if (codeTaken) {
      throw createError("Subject code already exists", 409);
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

  const data = {};
  for (const key of [
    "subject_code",
    "subject_name",
    "dept_id",
    "semester",
    "credits",
    "is_active",
  ]) {
    if (patch[key] !== undefined) {
      data[key] = patch[key];
    }
  }

  const updated = await prisma.subject.update({
    where: { subject_id: parsedId },
    data,
  });

  return mapSubject(updated);
}
