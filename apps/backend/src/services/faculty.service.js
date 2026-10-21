import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createFaculty(facultyData) {
  const { userId, employee_id, full_name, dept_id, designation, phone, photo_url } = facultyData;

  const existingFaculty = await prisma.faculty.findUnique({
    where: {
      employee_id,
    },
  });

  if (existingFaculty) {
    throw createError("Employee ID already exists", 409);
  }

  const user = await prisma.user.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role !== "FACULTY") {
    throw createError("User must have FACULTY role", 403);
  }

  const existingUserProfile = await prisma.faculty.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (existingUserProfile) {
    throw createError("Faculty profile already exists", 409);
  }

  const department = await prisma.department.findUnique({
    where: {
      dept_id,
    },
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  const faculty = await prisma.faculty.create({
    data: {
      user_id: userId,
      employee_id,
      full_name,
      dept_id,
      designation,
      phone,
      photo_url,
    },
  });

  return {
    facultyId: faculty.faculty_id,
    employeeId: faculty.employee_id,
    userId: faculty.user_id,
    full_name: faculty.full_name,
    dept_id: faculty.dept_id,
    designation: faculty.designation,
    phone: faculty.phone,
    photo_url: faculty.photo_url,
  };
}
