import prisma from "../config/db.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createNotice(noticeData, user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  let { title, content, category, priority, target_type, target_value } = noticeData;

  if (target_type === "all") {
    target_value = "ALL";
  } else if (target_type === "dept") {
    const departmentId = Number(target_value);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      throw createError("Invalid department id", 400);
    }

    const department = await prisma.department.findUnique({
      where: {
        dept_id: departmentId,
      },
    });

    if (!department) {
      throw createError("Department not found", 404);
    }

    if (user.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: {
          user_id,
        },
      });

      if (!faculty) {
        throw createError("Faculty profile not found", 404);
      }

      if (faculty.dept_id !== departmentId) {
        throw createError("You can only target your own department", 403);
      }
    }

    target_value = String(departmentId);
  } else if (target_type === "year") {
    const year = Number(target_value);

    if (!Number.isInteger(year) || year < 1 || year > 4) {
      throw createError("Invalid year", 400);
    }

    target_value = String(year);
  } else if (target_type === "section") {
    const parts = target_value.split(":");

    if (parts.length !== 2) {
      throw createError("Invalid section target format. Use departmentId:section", 400);
    }

    const dept_id_string = parts[0].trim();
    const section = parts[1].trim();
    const dept_id = Number(dept_id_string);

    if (!Number.isInteger(dept_id) || dept_id <= 0) {
      throw createError("Invalid department id", 400);
    }

    if (!section) {
      throw createError("Section cannot be empty", 400);
    }

    const dept = await prisma.department.findUnique({
      where: {
        dept_id,
      },
    });

    if (!dept) {
      throw createError("Department not found", 404);
    }

    if (user.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: {
          user_id,
        },
      });

      if (!faculty) {
        throw createError("Faculty profile not found", 404);
      }

      if (faculty.dept_id !== dept_id) {
        throw createError("You can only target your own department", 403);
      }
    }

    target_value = `${dept_id}:${section}`;
  }

  const notice = await prisma.notice.create({
    data: {
      created_by: user_id,
      title,
      content,
      category,
      priority,
      target_type,
      target_value,
    },
  });

  return {
    notice_id: notice.notice_id,
    created_by: notice.created_by,
    title: notice.title,
    content: notice.content,
    category: notice.category,
    priority: notice.priority,
    target_type: notice.target_type,
    target_value: notice.target_value,
  };
}

function sortNotices(notices) {
  const priorityRank = {
    urgent: 0,
    important: 1,
    normal: 2,
  };

  return notices.sort((a, b) => {
    const priorityDifference = priorityRank[a.priority] - priorityRank[b.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export async function getNotice(user_id) {
  const user = await prisma.user.findUnique({
    where: {
      user_id,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.role === "ADMINISTRATOR") {
    const notice = await prisma.notice.findMany();
    return sortNotices(notice);
  } else if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    const notice = await prisma.notice.findMany({
      where: {
        OR: [
          {
            target_type: "all",
            target_value: "ALL",
          },
          {
            target_type: "dept",
            target_value: String(faculty.dept_id),
          },
        ],
      },
    });

    return sortNotices(notice);
  } else if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: {
        user_id,
      },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (!Number.isInteger(student.semester) || student.semester < 1 || student.semester > 8) {
      throw createError("Invalid student semester", 400);
    }

    const year = Math.ceil(student.semester / 2);

    const notice = await prisma.notice.findMany({
      where: {
        OR: [
          {
            target_type: "all",
            target_value: "ALL",
          },
          {
            target_type: "dept",
            target_value: String(student.dept_id),
          },
          {
            target_type: "section",
            target_value: `${student.dept_id}:${student.section}`,
          },
          {
            target_type: "year",
            target_value: String(year),
          },
        ],
      },
    });

    return sortNotices(notice);
  } else {
    throw createError("Unsupported user role", 403);
  }
}
