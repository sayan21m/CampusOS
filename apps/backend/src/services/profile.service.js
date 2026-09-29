import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
      photo_url: student.photo_url,
    };
  } else {
    throw createError("Profile not available", 404);
  }
}
