import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const ALLOCATION_INCLUDE = {
  faculty: {
    select: {
      faculty_id: true,
      employee_id: true,
      full_name: true,
      dept_id: true,
      designation: true,
    },
  },
  subject: {
    select: {
      subject_id: true,
      subject_code: true,
      subject_name: true,
      dept_id: true,
      semester: true,
      is_active: true,
    },
  },
};

export async function listAllocations({ faculty_id, subject_id, dept_id } = {}) {
  const where = {};

  if (faculty_id !== undefined) {
    where.faculty_id = faculty_id;
  }

  if (subject_id !== undefined) {
    where.subject_id = subject_id;
  }

  if (dept_id !== undefined) {
    where.OR = [{ faculty: { dept_id } }, { subject: { dept_id } }];
  }

  return prisma.facultySubjectAllocation.findMany({
    where,
    include: ALLOCATION_INCLUDE,
    orderBy: [{ subject_id: "asc" }, { faculty_id: "asc" }],
  });
}

export async function createAllocation({ faculty_id, subject_id }) {
  const faculty = await prisma.faculty.findUnique({
    where: { faculty_id },
  });

  if (!faculty) {
    throw createError("Faculty not found", 404);
  }

  const subject = await prisma.subject.findUnique({
    where: { subject_id },
  });

  if (!subject) {
    throw createError("Subject not found", 404);
  }

  if (!subject.is_active) {
    throw createError("Cannot allocate an inactive subject", 400);
  }

  if (faculty.dept_id !== subject.dept_id) {
    throw createError("Faculty and subject must belong to the same department", 400);
  }

  const existing = await prisma.facultySubjectAllocation.findUnique({
    where: {
      faculty_id_subject_id: {
        faculty_id,
        subject_id,
      },
    },
  });

  if (existing) {
    throw createError("Faculty is already allocated to this subject", 409);
  }

  return prisma.facultySubjectAllocation.create({
    data: {
      faculty_id,
      subject_id,
    },
    include: ALLOCATION_INCLUDE,
  });
}

export async function deleteAllocation(allocationId) {
  const parsedId = Number(allocationId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createError("Invalid allocation ID", 400);
  }

  const existing = await prisma.facultySubjectAllocation.findUnique({
    where: { allocation_id: parsedId },
  });

  if (!existing) {
    throw createError("Allocation not found", 404);
  }

  await prisma.facultySubjectAllocation.delete({
    where: { allocation_id: parsedId },
  });

  return {
    allocation_id: parsedId,
    message: "Allocation deleted successfully",
  };
}

export async function isFacultyAllocatedToSubject(faculty_id, subject_id) {
  const allocation = await prisma.facultySubjectAllocation.findUnique({
    where: {
      faculty_id_subject_id: {
        faculty_id,
        subject_id,
      },
    },
    select: { allocation_id: true },
  });

  if (allocation) {
    return true;
  }

  const timetableAllotment = await prisma.timetableSlot.findFirst({
    where: {
      faculty_id,
      subject_id,
    },
    select: { timetable_id: true },
  });

  return Boolean(timetableAllotment);
}
