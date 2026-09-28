import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createStudent(studentData) {
  const {
    userId,
    roll_number,
    full_name,
    dept_id,
    semester,
    section,
    admission_year,
    phone,
    photo_url,
  } = studentData;

  const existingStudent = await prisma.student.findUnique({
    where: {
      roll_number,
    },
  });

  if (existingStudent) {
    throw createError("Roll number already exists", 409);
  }

  const user = await prisma.user.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "STUDENT") {
    throw createError("User must have STUDENT role", 403);
  }

  const existingUserProfile = await prisma.student.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (existingUserProfile) {
    throw createError("Student profile already exists", 409);
  }

  const department = await prisma.department.findUnique({
    where: {
      dept_id,
    },
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  const student = await prisma.student.create({
    data: {
      user_id: userId,
      roll_number,
      full_name,
      dept_id,
      semester,
      section,
      admission_year,
      phone,
      photo_url,
    },
  });

  return {
    studentId: student.student_id,
    userId: student.user_id,
    roll_number: student.roll_number,
    full_name: student.full_name,
    dept_id: student.dept_id,
    semester: student.semester,
    section: student.section,
    admission_year: student.admission_year,
    phone: student.phone,
    photo_url: student.photo_url,
  };
}
