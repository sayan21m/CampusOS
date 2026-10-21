import prisma from "../config/db.js";

export async function getAdminOverview() {
  const [
    usersTotal,
    usersActive,
    students,
    faculty,
    admins,
    notices,
    materials,
    departments,
    subjectsTotal,
    subjectsActive,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "FACULTY" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.notice.count(),
    prisma.notes.count(),
    prisma.department.count(),
    prisma.subject.count(),
    prisma.subject.count({ where: { is_active: true } }),
  ]);

  return {
    users: {
      total: usersTotal,
      active: usersActive,
      inactive: usersTotal - usersActive,
      students,
      faculty,
      admins,
    },
    notices: {
      total: notices,
    },
    materials: {
      total: materials,
    },
    departments: {
      total: departments,
    },
    subjects: {
      total: subjectsTotal,
      active: subjectsActive,
    },
  };
}
