import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
