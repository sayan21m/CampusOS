import prisma from "../config/db.js";
import { parseDateOnly } from "../validators/calendar.validator.js";
import { SEARCH_TYPES } from "../validators/search.validator.js";

export const SEARCH_RESULT_LIMIT = 10;
export const RECENT_SEARCH_LIMIT = 10;
export const SEARCH_HISTORY_KEEP = 20;

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function contains(query) {
  return { contains: query, mode: "insensitive" };
}

function endOfDate(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function createdAtFilter(from, to) {
  if (!from && !to) {
    return {};
  }

  const created_at = {};
  if (from) {
    created_at.gte = parseDateOnly(from);
  }
  if (to) {
    created_at.lte = endOfDate(parseDateOnly(to));
  }

  return { created_at };
}

function deadlineFilter(from, to) {
  if (!from && !to) {
    return {};
  }

  const deadline = {};
  if (from) {
    deadline.gte = parseDateOnly(from);
  }
  if (to) {
    deadline.lte = endOfDate(parseDateOnly(to));
  }

  return { deadline };
}

function calendarDateFilter(from, to) {
  const and = [];

  if (from) {
    and.push({ end_date: { gte: parseDateOnly(from) } });
  }
  if (to) {
    and.push({ start_date: { lte: parseDateOnly(to) } });
  }

  return and.length > 0 ? { AND: and } : {};
}

function noticeVisibilityWhere(actor) {
  if (actor.user.role === "ADMIN") {
    return {};
  }

  if (actor.user.role === "FACULTY") {
    return {
      OR: [
        { target_type: "all", target_value: "ALL" },
        { target_type: "dept", target_value: String(actor.faculty.dept_id) },
      ],
    };
  }

  const year = Math.ceil(actor.student.semester / 2);

  return {
    OR: [
      { target_type: "all", target_value: "ALL" },
      { target_type: "dept", target_value: String(actor.student.dept_id) },
      { target_type: "section", target_value: `${actor.student.dept_id}:${actor.student.section}` },
      { target_type: "year", target_value: String(year) },
    ],
  };
}

async function loadActor(userId) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw createError("User not found or inactive", 403);
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      throw createError("Student profile not found", 404);
    }

    if (!Number.isInteger(student.semester) || student.semester < 1 || student.semester > 8) {
      throw createError("Invalid student semester", 400);
    }

    return { user, student, faculty: null };
  }

  if (user.role === "FACULTY") {
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
    });

    if (!faculty) {
      throw createError("Faculty profile not found", 404);
    }

    return { user, student: null, faculty };
  }

  if (user.role === "ADMIN") {
    return { user, student: null, faculty: null };
  }

  throw createError("Unsupported user role", 403);
}

function shouldSearch(typeFilter, type) {
  return !typeFilter || typeFilter === type;
}

async function facultySubjectIds(facultyId) {
  const [slots, allocations] = await Promise.all([
    prisma.timetableSlot.findMany({
      where: { faculty_id: facultyId },
      select: { subject_id: true },
      distinct: ["subject_id"],
    }),
    prisma.facultySubjectAllocation.findMany({
      where: { faculty_id: facultyId },
      select: { subject_id: true },
    }),
  ]);

  return [...new Set([...slots, ...allocations].map((row) => row.subject_id))];
}

function mapNotice(notice) {
  return {
    type: "NOTICE",
    id: notice.notice_id,
    title: notice.title,
    detail: notice.content?.slice(0, 140) || notice.category,
    href: "/notices",
  };
}

function mapNotes(note) {
  return {
    type: "NOTES",
    id: note.notes_id,
    title: note.title,
    detail: `${note.subject?.subject_code || `SUB-${note.subject_id}`} · Unit ${note.unit_number}`,
    href: "/notes",
    subject_id: note.subject_id,
  };
}

function mapAssignment(assignment) {
  return {
    type: "ASSIGNMENT",
    id: assignment.assignment_id,
    title: assignment.title,
    detail: `${assignment.subject?.subject_name || "Subject"} · ${assignment.subject?.subject_code || `SUB-${assignment.subject_id}`}`,
    href: "/assignments",
    subject_id: assignment.subject_id,
  };
}

function mapUserHit(user) {
  return {
    type: "USER",
    id: user.user_id,
    title: user.name,
    detail: `${user.role} · ${user.email}`,
    href: "/admin-profile",
  };
}

function mapSubject(subject) {
  return {
    type: "SUBJECT",
    id: subject.subject_id,
    title: subject.subject_name,
    detail: `${subject.subject_code} · Sem ${subject.semester}`,
    href: "/notes",
    subject_id: subject.subject_id,
  };
}

function mapEvent(entry) {
  return {
    type: "EVENT",
    id: entry.calendar_id,
    title: entry.title,
    detail: entry.entry_type.replace(/_/g, " "),
    href: "/calendar",
  };
}

async function searchNotices(actor, query, filters) {
  return prisma.notice.findMany({
    where: {
      AND: [
        noticeVisibilityWhere(actor),
        {
          OR: [
            { title: contains(query) },
            { content: contains(query) },
            { category: contains(query) },
          ],
        },
        createdAtFilter(filters.from, filters.to),
      ],
    },
    orderBy: { created_at: "desc" },
    take: SEARCH_RESULT_LIMIT,
    select: {
      notice_id: true,
      title: true,
      content: true,
      category: true,
      created_at: true,
    },
  }).then((rows) => rows.map(mapNotice));
}

async function searchNotes(actor, query, filters) {
  const where = {
    AND: [
      {
        OR: [
          { title: contains(query) },
          { description: contains(query) },
          { subject: { subject_name: contains(query) } },
          { subject: { subject_code: contains(query) } },
        ],
      },
      createdAtFilter(filters.from, filters.to),
    ],
  };

  if (filters.subject_id) {
    where.AND.push({ subject_id: filters.subject_id });
  }

  if (actor.user.role === "STUDENT") {
    where.AND.push({
      subject: {
        dept_id: actor.student.dept_id,
        semester: actor.student.semester,
        is_active: true,
      },
    });
  } else if (actor.user.role === "FACULTY") {
    where.AND.push({ uploaded_by: actor.faculty.faculty_id });
  }

  return prisma.notes.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: SEARCH_RESULT_LIMIT,
    select: {
      notes_id: true,
      subject_id: true,
      title: true,
      unit_number: true,
      created_at: true,
      subject: {
        select: {
          subject_code: true,
          subject_name: true,
        },
      },
    },
  }).then((rows) => rows.map(mapNotes));
}

async function searchAssignments(actor, query, filters) {
  const where = {
    AND: [
      {
        OR: [
          { title: contains(query) },
          { description: contains(query) },
          { subject: { subject_name: contains(query) } },
          { subject: { subject_code: contains(query) } },
        ],
      },
      deadlineFilter(filters.from, filters.to),
    ],
  };

  if (filters.subject_id) {
    where.AND.push({ subject_id: filters.subject_id });
  }

  if (actor.user.role === "STUDENT") {
    where.AND.push({
      subject: {
        dept_id: actor.student.dept_id,
        semester: actor.student.semester,
      },
      OR: [{ section: actor.student.section }, { section: "ALL" }],
    });
  } else if (actor.user.role === "FACULTY") {
    where.AND.push({ faculty_id: actor.faculty.faculty_id });
  }

  return prisma.assignment.findMany({
    where,
    orderBy: { deadline: "asc" },
    take: SEARCH_RESULT_LIMIT,
    select: {
      assignment_id: true,
      subject_id: true,
      title: true,
      deadline: true,
      subject: {
        select: {
          subject_code: true,
          subject_name: true,
        },
      },
    },
  }).then((rows) => rows.map(mapAssignment));
}

async function searchUsers(actor, query) {
  if (actor.user.role === "STUDENT") {
    return [];
  }

  const where = {
    AND: [
      {
        OR: [
          { name: contains(query) },
          { email: contains(query) },
          { student: { roll_number: contains(query) } },
          { student: { full_name: contains(query) } },
          { faculty: { employee_id: contains(query) } },
          { faculty: { full_name: contains(query) } },
        ],
      },
    ],
  };

  if (actor.user.role === "FACULTY") {
    where.AND.push({
      OR: [
        { student: { dept_id: actor.faculty.dept_id } },
        { faculty: { dept_id: actor.faculty.dept_id } },
      ],
    });
  }

  return prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: SEARCH_RESULT_LIMIT,
    select: {
      user_id: true,
      name: true,
      email: true,
      role: true,
    },
  }).then((rows) => rows.map(mapUserHit));
}

async function searchSubjects(actor, query, filters) {
  const where = {
    AND: [
      {
        OR: [
          { subject_name: contains(query) },
          { subject_code: contains(query) },
        ],
      },
      { is_active: true },
    ],
  };

  if (filters.subject_id) {
    where.AND.push({ subject_id: filters.subject_id });
  }

  if (actor.user.role === "STUDENT") {
    where.AND.push({
      dept_id: actor.student.dept_id,
      semester: actor.student.semester,
    });
  } else if (actor.user.role === "FACULTY") {
    const subjectIds = await facultySubjectIds(actor.faculty.faculty_id);
    if (subjectIds.length === 0) {
      return [];
    }
    where.AND.push({ subject_id: { in: subjectIds } });
  }

  return prisma.subject.findMany({
    where,
    orderBy: { subject_code: "asc" },
    take: SEARCH_RESULT_LIMIT,
    select: {
      subject_id: true,
      subject_code: true,
      subject_name: true,
      semester: true,
    },
  }).then((rows) => rows.map(mapSubject));
}

async function searchEvents(query, filters) {
  return prisma.academicCalendar.findMany({
    where: {
      AND: [
        {
          OR: [
            { title: contains(query) },
            { description: contains(query) },
          ],
        },
        calendarDateFilter(filters.from, filters.to),
      ],
    },
    orderBy: [{ start_date: "asc" }, { calendar_id: "asc" }],
    take: SEARCH_RESULT_LIMIT,
    select: {
      calendar_id: true,
      title: true,
      entry_type: true,
      start_date: true,
      end_date: true,
    },
  }).then((rows) => rows.map(mapEvent));
}

export async function recordRecentSearch(userId, query) {
  const normalized = String(query || "").trim();
  if (normalized.length < 2) {
    return;
  }

  await prisma.searchHistory.deleteMany({
    where: {
      user_id: userId,
      query: normalized,
    },
  });

  await prisma.searchHistory.create({
    data: {
      user_id: userId,
      query: normalized,
    },
  });

  const stale = await prisma.searchHistory.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    skip: SEARCH_HISTORY_KEEP,
    select: { search_id: true },
  });

  if (stale.length > 0) {
    await prisma.searchHistory.deleteMany({
      where: {
        search_id: { in: stale.map((row) => row.search_id) },
      },
    });
  }
}

export async function listRecentSearches(userId) {
  await loadActor(userId);

  return prisma.searchHistory.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: RECENT_SEARCH_LIMIT,
    select: {
      search_id: true,
      query: true,
      created_at: true,
    },
  });
}

export async function searchCampus(userId, query = {}) {
  const actor = await loadActor(userId);
  const q = String(query.q || "").trim();
  const type = query.type;
  const filters = {
    subject_id: query.subject_id,
    from: query.from,
    to: query.to,
  };

  const empty = {
    NOTICE: [],
    NOTES: [],
    ASSIGNMENT: [],
    USER: [],
    SUBJECT: [],
    EVENT: [],
  };

  const tasks = {
    NOTICE: () => searchNotices(actor, q, filters),
    NOTES: () => searchNotes(actor, q, filters),
    ASSIGNMENT: () => searchAssignments(actor, q, filters),
    USER: () => searchUsers(actor, q),
    SUBJECT: () => searchSubjects(actor, q, filters),
    EVENT: () => searchEvents(q, filters),
  };

  const results = { ...empty };

  await Promise.all(
    SEARCH_TYPES.filter((searchType) => shouldSearch(type, searchType)).map(async (searchType) => {
      results[searchType] = await tasks[searchType]();
    })
  );

  await recordRecentSearch(userId, q);

  const groups = SEARCH_TYPES.map((searchType) => ({
    type: searchType,
    count: results[searchType].length,
    items: results[searchType],
  })).filter((group) => !type || group.type === type);

  return {
    query: q,
    type: type || null,
    count: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
    results,
  };
}
