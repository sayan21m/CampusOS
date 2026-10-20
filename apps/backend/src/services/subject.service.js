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
      where: { is_active: true },
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

  return {
    subjectId: subject.subject_id,
    subject_code: subject.subject_code,
    subject_name: subject.subject_name,
    dept_id: subject.dept_id,
    semester: subject.semester,
    credits: subject.credits,
    is_active: subject.is_active,
  };
}
