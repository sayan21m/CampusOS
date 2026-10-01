import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createDepartment(dept_name, dept_code) {
  const existingDept = await prisma.department.findFirst({
    where: {
      OR: [{ dept_name }, { dept_code }],
    },
  });

  if (existingDept) {
    throw createError("Department already exists", 409);
  }

  const dept = await prisma.department.create({
    data: {
      dept_name,
      dept_code,
    },
  });

  return {
    dept_id: dept.dept_id,
    dept_name: dept.dept_name,
    dept_code: dept.dept_code,
  };
}

export async function getDepartments() {
  const departments = await prisma.department.findMany({
    orderBy: {
      dept_name: "asc",
    },
  });

  return departments;
}

export async function getDepartmentById(dept_id) {
  if (!Number.isInteger(dept_id) || dept_id < 1) {
    throw createError("Invalid department id", 400);
  }

  const department = await prisma.department.findUnique({
    where: {
      dept_id,
    },
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  return department;
}

export async function updateDepartment(dept_id, data) {
  if (!Number.isInteger(dept_id) || dept_id < 1) {
    throw createError("Invalid department id", 400);
  }

  const dept = await prisma.department.findUnique({
    where: {
      dept_id,
    },
  });

  if (!dept) {
    throw createError("Department not found", 404);
  }

  const existingDept = await prisma.department.findFirst({
    where: {
      OR: [{ dept_name: data.dept_name }, { dept_code: data.dept_code }],
      NOT: {
        dept_id,
      },
    },
  });

  if (existingDept) {
    throw createError("Department already exists", 409);
  }

  const updatedDepartment = await prisma.department.update({
    where: {
      dept_id,
    },
    data,
  });

  return {
    dept_id: updatedDepartment.dept_id,
    dept_name: updatedDepartment.dept_name,
    dept_code: updatedDepartment.dept_code,
  };
}
