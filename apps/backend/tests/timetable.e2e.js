import "dotenv/config";
import jwt from "jsonwebtoken";
import prisma from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";
import { getKolkataDayOfWeek } from "../src/services/timetable.service.js";

const BASE_URL = "http://localhost:3000/api/v1";

async function request(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  let data = null;
  const text = await response.text();

  if (text) {
    data = JSON.parse(text);
  }

  return {
    status: response.status,
    data,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertNoSensitiveFields(payload, label) {
  const serialized = JSON.stringify(payload);
  assert(
    !/passwordHash|password_hash|tokenHash|resetToken|"password"\s*:/i.test(serialized),
    `${label} must not expose password hashes, reset tokens, or raw passwords`
  );
}

function subjectCodeFor(testId, suffix = "") {
  return `TS${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId, prefix = "TD") {
  return `${prefix}${String(testId).slice(-8)}`.slice(0, 10);
}

function employeeIdFor(testId, suffix = "") {
  return `TF${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function rollNumberFor(testId, suffix = "") {
  return `TR${String(testId).slice(-8)}${suffix}`.slice(0, 20);
}

function timetableQuery(params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/timetable?${query}` : "/timetable";
}

async function createTemporaryUser({ email, name, role, password }) {
  const passwordHash = await hashPassword(password);

  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      isActive: true,
      passwordHash,
      name,
    },
    create: {
      name,
      email,
      passwordHash,
      role,
    },
  });
}

async function getAdminToken(testId) {
  const envEmail = process.env.E2E_ADMIN_EMAIL;
  const envPassword = process.env.E2E_ADMIN_PASSWORD;

  if (envEmail && envPassword) {
    let loginResponse = await request("POST", "/auth/login", {
      email: envEmail,
      password: envPassword,
    });

    if (loginResponse.status === 200) {
      return {
        token: loginResponse.data.result.token,
        ephemeralAdminEmail: null,
      };
    }

    // Ensure the configured admin exists with role ADMIN, then retry login.
    await createTemporaryUser({
      email: envEmail,
      name: "E2E Admin",
      role: "ADMIN",
      password: envPassword,
    });

    loginResponse = await request("POST", "/auth/login", {
      email: envEmail,
      password: envPassword,
    });

    if (loginResponse.status === 200) {
      return {
        token: loginResponse.data.result.token,
        ephemeralAdminEmail: null,
      };
    }

    console.log("Configured admin login failed; using ephemeral test administrator.");
  }

  const email = `e2e.timetable.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Timetable Admin",
    role: "ADMIN",
    password,
  });

  const loginResponse = await request("POST", "/auth/login", {
    email,
    password,
  });

  assert(
    loginResponse.status === 200,
    `Ephemeral admin login should return 200 (got ${loginResponse.status})`
  );

  return {
    token: loginResponse.data.result.token,
    ephemeralAdminEmail: email,
  };
}

async function cleanupTestData({
  timetableIds,
  subjectIds,
  facultyUserIds,
  departmentIds,
  userEmails,
}) {
  const slots = (timetableIds || []).filter(Boolean);

  if (slots.length > 0) {
    await prisma.timetableException.deleteMany({
      where: {
        timetable_id: { in: slots },
      },
    });

    await prisma.timetableSlot.deleteMany({
      where: {
        timetable_id: { in: slots },
      },
    });
  }

  const subjects = (subjectIds || []).filter(Boolean);

  if (subjects.length > 0) {
    await prisma.subject.deleteMany({
      where: {
        subject_id: { in: subjects },
      },
    });
  }

  const facultyIds = (facultyUserIds || []).filter(Boolean);

  if (facultyIds.length > 0) {
    await prisma.faculty.deleteMany({
      where: {
        user_id: { in: facultyIds },
      },
    });
  }

  const emails = (userEmails || []).filter(Boolean);

  if (emails.length > 0) {
    // Delete users (and cascaded student profiles) before departments.
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }

  const departments = (departmentIds || []).filter(Boolean);

  if (departments.length > 0) {
    await prisma.department.deleteMany({
      where: {
        dept_id: { in: departments },
      },
    });
  }
}

async function runTests() {
  console.log("\nRunning Timetable API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.timetable.faculty.${testId}@campusos.test`;
  const facultyEmail2 = `e2e.timetable.faculty2.${testId}@campusos.test`;
  const studentEmail = `e2e.timetable.student.${testId}@campusos.test`;
  const orphanFacultyEmail = `e2e.timetable.orphan.faculty.${testId}@campusos.test`;
  const guestEmail = `e2e.timetable.guest.${testId}@campusos.test`;
  const emptyStudentEmail = `e2e.timetable.empty.student.${testId}@campusos.test`;
  const departmentName = `E2E Timetable Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const otherDepartmentName = `E2E Timetable Other Dept ${testId}`;
  const otherDepartmentCode = deptCodeFor(testId, "TO");
  const subjectCode = subjectCodeFor(testId);
  const otherSemesterSubjectCode = subjectCodeFor(testId, "S");
  const employeeId = employeeIdFor(testId);
  const employeeId2 = employeeIdFor(testId, "B");
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";
  const orphanFacultyPassword = "OrphanFac@123";
  const guestPassword = "Guest@123456";

  let departmentId;
  let otherDepartmentId;
  let subjectId;
  let otherSemesterSubjectId;
  let facultyId;
  let facultyId2;
  let facultyUserId;
  let facultyUserId2;
  let otherDeptFacultyUserId;
  let studentUserId;
  let ephemeralAdminEmail;
  const createdTimetableIds = [];
  const createdSubjectIds = [];

  try {
    // --------------------------------------------------
    // 1. Login Admin
    // --------------------------------------------------

    const adminAuth = await getAdminToken(testId);
    const adminToken = adminAuth.token;
    ephemeralAdminEmail = adminAuth.ephemeralAdminEmail;

    console.log("Login Admin: 200");

    assert(adminToken, "Admin login should return JWT token");

    // --------------------------------------------------
    // 2. Create temporary Department
    // --------------------------------------------------

    const departmentResponse = await request(
      "POST",
      "/departments",
      {
        dept_name: departmentName,
        dept_code: departmentCode,
      },
      adminToken
    );

    console.log("Create Department:", departmentResponse.status);

    assert(departmentResponse.status === 201, "Department creation should return 201");

    departmentId = departmentResponse.data.department.dept_id;

    assert(departmentId, "Department response should contain dept_id");

    const otherDepartmentResponse = await request(
      "POST",
      "/departments",
      {
        dept_name: otherDepartmentName,
        dept_code: otherDepartmentCode,
      },
      adminToken
    );

    assert(otherDepartmentResponse.status === 201, "Other department creation should return 201");

    otherDepartmentId = otherDepartmentResponse.data.department.dept_id;

    // --------------------------------------------------
    // 3. Create Subject + Faculty fixtures
    // --------------------------------------------------

    const subjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "E2E Timetable Subject",
        dept_id: departmentId,
        semester: 5,
        credits: 4,
      },
      adminToken
    );

    assert(subjectResponse.status === 201, "Subject creation should return 201");

    subjectId = subjectResponse.data.subject.subjectId;
    createdSubjectIds.push(subjectId);

    const otherSemesterSubjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: otherSemesterSubjectCode,
        subject_name: "E2E Other Semester Subject",
        dept_id: departmentId,
        semester: 3,
        credits: 3,
      },
      adminToken
    );

    assert(
      otherSemesterSubjectResponse.status === 201,
      "Other-semester subject creation should return 201"
    );

    otherSemesterSubjectId = otherSemesterSubjectResponse.data.subject.subjectId;
    createdSubjectIds.push(otherSemesterSubjectId);

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Timetable Faculty",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId = facultyUser.user_id;

    const facultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Timetable Faculty",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    assert(facultyResponse.status === 201, "Faculty creation should return 201");

    facultyId = facultyResponse.data.faculty.facultyId;

    const facultyUser2 = await createTemporaryUser({
      email: facultyEmail2,
      name: "E2E Timetable Faculty 2",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId2 = facultyUser2.user_id;

    const faculty2Response = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId2,
        employee_id: employeeId2,
        full_name: "E2E Timetable Faculty 2",
        dept_id: departmentId,
        designation: "Associate Professor",
        phone: "9876543211",
      },
      adminToken
    );

    assert(faculty2Response.status === 201, "Second faculty creation should return 201");

    facultyId2 = faculty2Response.data.faculty.facultyId;

    console.log("Setup fixtures: passed");

    // --------------------------------------------------
    // A. Admin can create a timetable slot
    // --------------------------------------------------

    const createResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: " a ",
        day_of_week: 1,
        period: 1,
        room: "CSE-301",
        start_time: "10:00",
        end_time: "11:00",
      },
      adminToken
    );

    console.log("Create Timetable Slot:", createResponse.status);

    assert(createResponse.status === 201, "Timetable slot creation should return 201");

    const slot = createResponse.data.slot;

    assert(slot, "Response should contain slot");
    assert(slot.timetable_id, "Slot response should contain timetable_id");
    assert(slot.section === "A", "Section should be normalized to uppercase A");
    assert(slot.subject_id === subjectId, "Slot should contain correct subject_id");
    assert(slot.faculty_id === facultyId, "Slot should contain correct faculty_id");
    assert(slot.dept_id === departmentId, "Slot should contain correct dept_id");
    assert(slot.semester === 5, "Slot should contain semester 5");
    assert(slot.day_of_week === 1, "Slot should contain day_of_week 1");
    assert(slot.period === 1, "Slot should contain period 1");
    assert(slot.room === "CSE-301", "Slot should contain correct room");
    assert(slot.start_time === "10:00", "Slot should contain correct start_time");
    assert(slot.end_time === "11:00", "Slot should contain correct end_time");

    createdTimetableIds.push(slot.timetable_id);

    const persisted = await prisma.timetableSlot.findUnique({
      where: {
        timetable_id: slot.timetable_id,
      },
    });

    assert(persisted, "Created slot should be persisted in the database");
    assert(persisted.section === "A", "Persisted section should be A");

    console.log("Verify Timetable Slot: passed");

    // --------------------------------------------------
    // B. Student cannot create a timetable slot
    // --------------------------------------------------

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Timetable Student",
      email: studentEmail,
      password: studentPassword,
    });

    assert(registerResponse.status === 201, "Student registration should return 201");
    studentUserId = registerResponse.data.user.user_id;
    assert(studentUserId, "Student registration should return user_id");

    const studentLoginResponse = await request("POST", "/auth/login", {
      email: studentEmail,
      password: studentPassword,
    });

    assert(studentLoginResponse.status === 200, "Student login should return 200");

    const studentToken = studentLoginResponse.data.result.token;

    const studentCreateResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 1,
        period: 2,
        room: "CSE-302",
        start_time: "11:00",
        end_time: "12:00",
      },
      studentToken
    );

    console.log("Student Timetable Create:", studentCreateResponse.status);

    assert(studentCreateResponse.status === 403, "Student timetable creation should return 403");

    assert(
      studentCreateResponse.data?.message === "Access denied",
      'Student timetable creation should return message "Access denied"'
    );

    // --------------------------------------------------
    // C. Faculty cannot create a timetable slot
    // --------------------------------------------------

    const facultyLoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });

    assert(facultyLoginResponse.status === 200, "Faculty login should return 200");

    const facultyToken = facultyLoginResponse.data.result.token;

    const facultyCreateResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 1,
        period: 2,
        room: "CSE-302",
        start_time: "11:00",
        end_time: "12:00",
      },
      facultyToken
    );

    console.log("Faculty Timetable Create:", facultyCreateResponse.status);

    assert(facultyCreateResponse.status === 403, "Faculty timetable creation should return 403");

    assert(
      facultyCreateResponse.data?.message === "Access denied",
      'Faculty timetable creation should return message "Access denied"'
    );

    // --------------------------------------------------
    // D. Duplicate group-period
    // --------------------------------------------------

    const duplicateResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "A",
        day_of_week: 1,
        period: 1,
        room: "CSE-999",
        start_time: "14:00",
        end_time: "15:00",
      },
      adminToken
    );

    console.log("Duplicate group-period:", duplicateResponse.status);

    assert(duplicateResponse.status === 409, "Duplicate group-period should return 409");

    // --------------------------------------------------
    // E. Room overlap conflict
    // --------------------------------------------------

    const roomOverlapResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 1,
        period: 2,
        room: "CSE-301",
        start_time: "10:30",
        end_time: "11:30",
      },
      adminToken
    );

    console.log("Room overlap:", roomOverlapResponse.status);

    assert(roomOverlapResponse.status === 409, "Room overlap should return 409");

    // --------------------------------------------------
    // F. Faculty overlap conflict
    // --------------------------------------------------

    const facultyOverlapResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "C",
        day_of_week: 1,
        period: 3,
        room: "HALL-1",
        start_time: "10:15",
        end_time: "10:45",
      },
      adminToken
    );

    console.log("Faculty overlap:", facultyOverlapResponse.status);

    assert(facultyOverlapResponse.status === 409, "Faculty overlap should return 409");

    // --------------------------------------------------
    // G. Adjacent time does not conflict
    // --------------------------------------------------

    const adjacentResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 1,
        period: 2,
        room: "CSE-301",
        start_time: "11:00",
        end_time: "12:00",
      },
      adminToken
    );

    console.log("Adjacent time slot:", adjacentResponse.status);

    assert(adjacentResponse.status === 201, "Adjacent time slot should return 201");

    createdTimetableIds.push(adjacentResponse.data.slot.timetable_id);

    // --------------------------------------------------
    // H. Different section same period is allowed
    // --------------------------------------------------

    const otherSectionResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "D",
        day_of_week: 1,
        period: 1,
        room: "LAB-1",
        start_time: "08:00",
        end_time: "09:00",
      },
      adminToken
    );

    console.log("Different section same period:", otherSectionResponse.status);

    assert(otherSectionResponse.status === 201, "Different section same period should return 201");

    createdTimetableIds.push(otherSectionResponse.data.slot.timetable_id);

    // --------------------------------------------------
    // I. Subject/semester mismatch
    // --------------------------------------------------

    const mismatchResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: otherSemesterSubjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "E",
        day_of_week: 2,
        period: 1,
        room: "LAB-2",
        start_time: "09:00",
        end_time: "10:00",
      },
      adminToken
    );

    console.log("Subject semester mismatch:", mismatchResponse.status);

    assert(mismatchResponse.status === 400, "Subject semester mismatch should return 400");

    // --------------------------------------------------
    // J. Validation failure
    // --------------------------------------------------

    const validationResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "F",
        day_of_week: 1,
        period: 4,
        room: "CSE-303",
        start_time: "11:00",
        end_time: "10:00",
      },
      adminToken
    );

    console.log("Validation failure:", validationResponse.status);

    assert(validationResponse.status === 400, "Invalid timetable data should return 400");

    assert(
      validationResponse.data?.message === "Validation failed",
      'Invalid timetable data should return message "Validation failed"'
    );

    assert(
      Array.isArray(validationResponse.data?.errors) && validationResponse.data.errors.length > 0,
      "Validation failure should include errors array"
    );

    // --------------------------------------------------
    // K. Authentication
    // --------------------------------------------------

    const unauthResponse = await request("POST", "/timetable", {
      subject_id: subjectId,
      faculty_id: facultyId,
      dept_id: departmentId,
      semester: 5,
      section: "G",
      day_of_week: 1,
      period: 5,
      room: "CSE-304",
      start_time: "13:00",
      end_time: "14:00",
    });

    console.log("No Authorization:", unauthResponse.status);

    assert(unauthResponse.status === 401, "Unauthenticated timetable creation should return 401");

    assert(
      unauthResponse.data?.message === "Authentication required",
      'Unauthenticated timetable creation should return message "Authentication required"'
    );

    // --------------------------------------------------
    // L. PATCH timetable slot
    // --------------------------------------------------

    const patchRoomResponse = await request(
      "PATCH",
      `/timetable/${slot.timetable_id}`,
      { room: "Lab 2" },
      adminToken
    );

    console.log("PATCH room only:", patchRoomResponse.status);

    assert(patchRoomResponse.status === 200, "Partial room update should return 200");
    assert(patchRoomResponse.data?.slot?.room === "Lab 2", "Patched room should be Lab 2");
    assert(
      patchRoomResponse.data?.slot?.start_time === "10:00",
      "Omitted start_time should be preserved"
    );
    assert(
      patchRoomResponse.data?.slot?.end_time === "11:00",
      "Omitted end_time should be preserved"
    );
    assert(patchRoomResponse.data?.slot?.section === "A", "Omitted section should be preserved");

    const selfPatchResponse = await request(
      "PATCH",
      `/timetable/${slot.timetable_id}`,
      { room: "Lab 2" },
      adminToken
    );

    console.log("PATCH unchanged schedule:", selfPatchResponse.status);

    assert(
      selfPatchResponse.status === 200,
      "Updating a slot without schedule changes should not conflict with itself"
    );

    const emptyPatchResponse = await request(
      "PATCH",
      `/timetable/${slot.timetable_id}`,
      {},
      adminToken
    );

    console.log("PATCH empty body:", emptyPatchResponse.status);

    assert(emptyPatchResponse.status === 400, "Empty PATCH body should return 400");

    for (const invalidId of ["abc", "0", "-1", "1.5"]) {
      const invalidIdResponse = await request(
        "PATCH",
        `/timetable/${invalidId}`,
        { room: "Lab 3" },
        adminToken
      );

      console.log(`PATCH invalid id ${invalidId}:`, invalidIdResponse.status);

      assert(
        invalidIdResponse.status === 400,
        `Invalid timetable ID /${invalidId} should return 400`
      );
      assert(
        invalidIdResponse.data?.message === "Invalid timetable ID",
        `Invalid timetable ID /${invalidId} should return message "Invalid timetable ID"`
      );
    }

    const missingSlotResponse = await request(
      "PATCH",
      "/timetable/99999999",
      { room: "Lab 3" },
      adminToken
    );

    console.log("PATCH missing slot:", missingSlotResponse.status);

    assert(missingSlotResponse.status === 404, "Nonexistent slot should return 404");

    const studentPatchResponse = await request(
      "PATCH",
      `/timetable/${slot.timetable_id}`,
      { room: "Lab 9" },
      studentToken
    );

    console.log("Student PATCH:", studentPatchResponse.status);

    assert(studentPatchResponse.status === 403, "Non-admin PATCH should return 403");

    const secondSlotResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 1,
        period: 3,
        room: "CSE-310",
        start_time: "12:00",
        end_time: "13:00",
      },
      adminToken
    );

    assert(secondSlotResponse.status === 201, "Second slot setup should return 201");
    createdTimetableIds.push(secondSlotResponse.data.slot.timetable_id);

    const groupConflictResponse = await request(
      "PATCH",
      `/timetable/${secondSlotResponse.data.slot.timetable_id}`,
      {
        section: "A",
        period: 1,
        day_of_week: 1,
      },
      adminToken
    );

    console.log("PATCH group-period conflict:", groupConflictResponse.status);

    assert(groupConflictResponse.status === 409, "Group-period conflict should return 409");

    const roomConflictResponse = await request(
      "PATCH",
      `/timetable/${secondSlotResponse.data.slot.timetable_id}`,
      {
        room: "Lab 2",
        day_of_week: 1,
        start_time: "10:30",
        end_time: "11:30",
      },
      adminToken
    );

    console.log("PATCH room overlap:", roomConflictResponse.status);

    assert(roomConflictResponse.status === 409, "Room overlap should return 409");

    const facultyConflictResponse = await request(
      "PATCH",
      `/timetable/${secondSlotResponse.data.slot.timetable_id}`,
      {
        faculty_id: facultyId,
        day_of_week: 1,
        start_time: "10:30",
        end_time: "11:30",
        room: "CSE-777",
      },
      adminToken
    );

    console.log("PATCH faculty overlap:", facultyConflictResponse.status);

    assert(facultyConflictResponse.status === 409, "Faculty overlap should return 409");

    const badTimePatchResponse = await request(
      "PATCH",
      `/timetable/${slot.timetable_id}`,
      { start_time: "11:30" },
      adminToken
    );

    console.log("PATCH invalid merged time:", badTimePatchResponse.status);

    assert(
      badTimePatchResponse.status === 400,
      "Partial time that invalidates merged range should return 400"
    );

    // --------------------------------------------------
    // M. DELETE timetable slot
    // --------------------------------------------------

    const deleteTargetResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "D",
        day_of_week: 2,
        period: 4,
        room: "DEL-101",
        start_time: "09:00",
        end_time: "10:00",
      },
      adminToken
    );

    assert(deleteTargetResponse.status === 201, "Delete-target slot creation should return 201");

    const deleteTargetId = deleteTargetResponse.data.slot.timetable_id;
    createdTimetableIds.push(deleteTargetId);

    const relatedException = await prisma.timetableException.create({
      data: {
        timetable_id: deleteTargetId,
        exception_type: "CANCELLED",
        original_date: new Date(Date.UTC(2026, 9, 13)),
        reason: "E2E cascade check",
      },
    });

    assert(relatedException.timetable_exception_id, "Related exception fixture should be created");

    const deleteResponse = await request(
      "DELETE",
      `/timetable/${deleteTargetId}`,
      null,
      adminToken
    );

    console.log("DELETE slot:", deleteResponse.status);

    assert(deleteResponse.status === 200, "Admin deletion should return 200");
    assert(
      deleteResponse.data?.message === "Timetable slot deleted successfully",
      'Delete response should contain message "Timetable slot deleted successfully"'
    );
    assert(
      deleteResponse.data?.deletedSlot?.timetable_id === deleteTargetId,
      "Delete response should include the deleted record"
    );
    assert(
      !Object.prototype.hasOwnProperty.call(deleteResponse.data || {}, "stack"),
      "Delete response should not expose a stack trace"
    );

    const deletedFromDb = await prisma.timetableSlot.findUnique({
      where: { timetable_id: deleteTargetId },
    });

    assert(deletedFromDb === null, "Deleted slot should no longer exist in PostgreSQL");

    const cascadedException = await prisma.timetableException.findUnique({
      where: { timetable_exception_id: relatedException.timetable_exception_id },
    });

    assert(
      cascadedException === null,
      "Related TimetableException rows should cascade-delete with the slot"
    );

    const repeatDeleteResponse = await request(
      "DELETE",
      `/timetable/${deleteTargetId}`,
      null,
      adminToken
    );

    console.log("DELETE repeated:", repeatDeleteResponse.status);

    assert(repeatDeleteResponse.status === 404, "Repeated deletion should return 404");

    const unauthDeleteResponse = await request("DELETE", `/timetable/${slot.timetable_id}`);

    console.log("DELETE no auth:", unauthDeleteResponse.status);

    assert(unauthDeleteResponse.status === 401, "Unauthenticated DELETE should return 401");
    assert(
      unauthDeleteResponse.data?.message === "Authentication required",
      'Unauthenticated DELETE should return message "Authentication required"'
    );

    const invalidTokenDeleteResponse = await request(
      "DELETE",
      `/timetable/${slot.timetable_id}`,
      null,
      "not-a-real-jwt"
    );

    console.log("DELETE invalid token:", invalidTokenDeleteResponse.status);

    assert(invalidTokenDeleteResponse.status === 401, "Invalid token DELETE should return 401");
    assert(
      invalidTokenDeleteResponse.data?.message === "Invalid or expired token",
      'Invalid token DELETE should return message "Invalid or expired token"'
    );

    const studentDeleteResponse = await request(
      "DELETE",
      `/timetable/${slot.timetable_id}`,
      null,
      studentToken
    );

    console.log("Student DELETE:", studentDeleteResponse.status);

    assert(studentDeleteResponse.status === 403, "Student DELETE should return 403");

    const facultyDeleteResponse = await request(
      "DELETE",
      `/timetable/${slot.timetable_id}`,
      null,
      facultyToken
    );

    console.log("Faculty DELETE:", facultyDeleteResponse.status);

    assert(facultyDeleteResponse.status === 403, "Faculty DELETE should return 403");

    for (const invalidId of ["abc", "0", "-1", "1.5"]) {
      const invalidDeleteResponse = await request(
        "DELETE",
        `/timetable/${invalidId}`,
        null,
        adminToken
      );

      console.log(`DELETE invalid id ${invalidId}:`, invalidDeleteResponse.status);

      assert(
        invalidDeleteResponse.status === 400,
        `Invalid DELETE id /${invalidId} should return 400`
      );
      assert(
        invalidDeleteResponse.data?.message === "Invalid timetable ID",
        `Invalid DELETE id /${invalidId} should return message "Invalid timetable ID"`
      );
    }

    const missingDeleteResponse = await request("DELETE", "/timetable/99999999", null, adminToken);

    console.log("DELETE missing slot:", missingDeleteResponse.status);

    assert(missingDeleteResponse.status === 404, "Nonexistent DELETE should return 404");

    const regressionCreateResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "R",
        day_of_week: 3,
        period: 5,
        room: "REG-1",
        start_time: "15:00",
        end_time: "16:00",
      },
      adminToken
    );

    console.log("Regression create after delete tests:", regressionCreateResponse.status);

    assert(regressionCreateResponse.status === 201, "Create should still work after delete tests");
    createdTimetableIds.push(regressionCreateResponse.data.slot.timetable_id);

    const regressionPatchResponse = await request(
      "PATCH",
      `/timetable/${regressionCreateResponse.data.slot.timetable_id}`,
      { room: "REG-2" },
      adminToken
    );

    console.log("Regression PATCH after delete tests:", regressionPatchResponse.status);

    assert(regressionPatchResponse.status === 200, "Update should still work after delete tests");
    assert(
      regressionPatchResponse.data?.slot?.room === "REG-2",
      "Regression PATCH should update room"
    );

    // --------------------------------------------------
    // N. GET timetable
    // --------------------------------------------------

    const orderedSlots = [
      { day_of_week: 2, period: 1, room: "ORD-2-1", start_time: "09:00", end_time: "10:00" },
      { day_of_week: 1, period: 3, room: "ORD-1-3", start_time: "11:00", end_time: "12:00" },
      { day_of_week: 1, period: 1, room: "ORD-1-1", start_time: "08:00", end_time: "09:00" },
    ];

    for (const ordered of orderedSlots) {
      const orderedCreate = await request(
        "POST",
        "/timetable",
        {
          subject_id: subjectId,
          faculty_id: facultyId,
          dept_id: departmentId,
          semester: 5,
          section: "T",
          day_of_week: ordered.day_of_week,
          period: ordered.period,
          room: ordered.room,
          start_time: ordered.start_time,
          end_time: ordered.end_time,
        },
        adminToken
      );

      assert(orderedCreate.status === 201, `Ordered slot ${ordered.room} should create with 201`);
      createdTimetableIds.push(orderedCreate.data.slot.timetable_id);
    }

    const adminGetResponse = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" }),
      null,
      adminToken
    );

    console.log("GET admin timetable:", adminGetResponse.status);

    assert(adminGetResponse.status === 200, "ADMIN GET should return 200");
    assert(
      adminGetResponse.data?.message === "Timetable fetched successfully",
      'GET response should contain message "Timetable fetched successfully"'
    );
    assert(
      Array.isArray(adminGetResponse.data?.timetable),
      "GET response should include timetable array"
    );
    assert(
      adminGetResponse.data.timetable.length === 3,
      "ADMIN GET section T should return 3 slots"
    );

    for (const entry of adminGetResponse.data.timetable) {
      assert(entry.dept_id === departmentId, "Returned slot dept_id should match query");
      assert(entry.semester === 5, "Returned slot semester should match query");
      assert(entry.section === "T", "Returned slot section should be normalized T");
    }

    for (let i = 1; i < adminGetResponse.data.timetable.length; i += 1) {
      const prev = adminGetResponse.data.timetable[i - 1];
      const curr = adminGetResponse.data.timetable[i];
      const orderedOk =
        prev.day_of_week < curr.day_of_week ||
        (prev.day_of_week === curr.day_of_week && prev.period <= curr.period);
      assert(orderedOk, "Timetable should be ordered by day_of_week then period ascending");
    }

    assert(
      adminGetResponse.data.timetable
        .map((entry) => `${entry.day_of_week}-${entry.period}`)
        .join(",") === "1-1,1-3,2-1",
      "Ordered timetable should be day1/period1, day1/period3, day2/period1"
    );

    const facultyGetResponse = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" }),
      null,
      facultyToken
    );

    console.log("GET faculty own dept:", facultyGetResponse.status);

    assert(facultyGetResponse.status === 200, "FACULTY GET for own department should return 200");
    assert(
      facultyGetResponse.data.timetable.length === 3,
      "FACULTY GET should return section T slots"
    );

    const emptyGetResponse = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "Q" }),
      null,
      adminToken
    );

    console.log("GET empty section:", emptyGetResponse.status);

    assert(emptyGetResponse.status === 200, "Empty section GET should return 200");
    assert(
      Array.isArray(emptyGetResponse.data?.timetable) &&
        emptyGetResponse.data.timetable.length === 0,
      "Empty section should return an empty timetable array"
    );

    const unauthGetResponse = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" })
    );

    console.log("GET no auth:", unauthGetResponse.status);

    assert(unauthGetResponse.status === 401, "Unauthenticated GET should return 401");
    assert(
      unauthGetResponse.data?.message === "Authentication required",
      'Unauthenticated GET should return message "Authentication required"'
    );

    const invalidTokenGetResponse = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" }),
      null,
      "not-a-real-jwt"
    );

    console.log("GET invalid token:", invalidTokenGetResponse.status);

    assert(invalidTokenGetResponse.status === 401, "Invalid token GET should return 401");
    assert(
      invalidTokenGetResponse.data?.message === "Invalid or expired token",
      'Invalid token GET should return message "Invalid or expired token"'
    );

    const studentMissingProfileGet = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "A" }),
      null,
      studentToken
    );

    console.log("GET student missing profile:", studentMissingProfileGet.status);

    assert(studentMissingProfileGet.status === 404, "STUDENT without profile should return 404");
    assert(
      studentMissingProfileGet.data?.message === "Student profile not found",
      'Missing student profile should return message "Student profile not found"'
    );

    const studentProfileResponse = await request(
      "POST",
      "/students",
      {
        userId: studentUserId,
        roll_number: rollNumberFor(testId),
        full_name: "E2E Timetable Student",
        dept_id: departmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543210",
      },
      adminToken
    );

    assert(studentProfileResponse.status === 201, "Student profile creation should return 201");

    const studentOwnGet = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "A" }),
      null,
      studentToken
    );

    console.log("GET student own timetable:", studentOwnGet.status);

    assert(studentOwnGet.status === 200, "STUDENT GET for own timetable should return 200");
    assert(
      Array.isArray(studentOwnGet.data?.timetable),
      "STUDENT GET should return timetable array"
    );
    assert(
      studentOwnGet.data.timetable.every(
        (entry) => entry.dept_id === departmentId && entry.semester === 5 && entry.section === "A"
      ),
      "STUDENT timetable entries should match own dept/semester/section"
    );

    const studentSectionDenied = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "B" }),
      null,
      studentToken
    );

    console.log("GET student other section:", studentSectionDenied.status);

    assert(studentSectionDenied.status === 403, "STUDENT GET for other section should return 403");

    const studentSemesterDenied = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 6, section: "A" }),
      null,
      studentToken
    );

    console.log("GET student other semester:", studentSemesterDenied.status);

    assert(
      studentSemesterDenied.status === 403,
      "STUDENT GET for other semester should return 403"
    );

    const studentDeptDenied = await request(
      "GET",
      timetableQuery({ dept_id: otherDepartmentId, semester: 5, section: "A" }),
      null,
      studentToken
    );

    console.log("GET student other department:", studentDeptDenied.status);

    assert(studentDeptDenied.status === 403, "STUDENT GET for other department should return 403");

    const facultyOtherDept = await request(
      "GET",
      timetableQuery({ dept_id: otherDepartmentId, semester: 5, section: "A" }),
      null,
      facultyToken
    );

    console.log("GET faculty other department:", facultyOtherDept.status);

    assert(facultyOtherDept.status === 403, "FACULTY GET for other department should return 403");

    await createTemporaryUser({
      email: orphanFacultyEmail,
      name: "E2E Orphan Faculty",
      role: "FACULTY",
      password: orphanFacultyPassword,
    });

    const orphanFacultyLogin = await request("POST", "/auth/login", {
      email: orphanFacultyEmail,
      password: orphanFacultyPassword,
    });

    assert(orphanFacultyLogin.status === 200, "Orphan faculty login should return 200");

    const orphanFacultyGet = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" }),
      null,
      orphanFacultyLogin.data.result.token
    );

    console.log("GET faculty missing profile:", orphanFacultyGet.status);

    assert(orphanFacultyGet.status === 404, "FACULTY without profile should return 404");
    assert(
      orphanFacultyGet.data?.message === "Faculty profile not found",
      'Missing faculty profile should return message "Faculty profile not found"'
    );

    await createTemporaryUser({
      email: guestEmail,
      name: "E2E Guest",
      role: "GUEST",
      password: guestPassword,
    });

    const guestLogin = await request("POST", "/auth/login", {
      email: guestEmail,
      password: guestPassword,
    });

    assert(guestLogin.status === 200, "Guest login should return 200");

    const guestGet = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "T" }),
      null,
      guestLogin.data.result.token
    );

    console.log("GET unsupported role:", guestGet.status);

    assert(guestGet.status === 403, "Unsupported role GET should return 403");

    const validationCases = [
      [{ semester: 5, section: "A" }, "missing dept_id"],
      [{ dept_id: departmentId, section: "A" }, "missing semester"],
      [{ dept_id: departmentId, semester: 5 }, "missing section"],
      [{ dept_id: "abc", semester: 5, section: "A" }, "non-numeric dept_id"],
      [{ dept_id: departmentId, semester: "x", section: "A" }, "non-numeric semester"],
      [{ dept_id: 0, semester: 5, section: "A" }, "zero dept_id"],
      [{ dept_id: -1, semester: 5, section: "A" }, "negative dept_id"],
      [{ dept_id: departmentId, semester: 0, section: "A" }, "zero semester"],
      [{ dept_id: departmentId, semester: -1, section: "A" }, "negative semester"],
      [{ dept_id: "1.5", semester: 5, section: "A" }, "decimal dept_id"],
      [{ dept_id: departmentId, semester: "2.5", section: "A" }, "decimal semester"],
      [{ dept_id: departmentId, semester: 5, section: "   " }, "whitespace section"],
      [{ dept_id: departmentId, semester: 5, section: "" }, "empty section"],
    ];

    for (const [params, label] of validationCases) {
      const validationResponse = await request("GET", timetableQuery(params), null, adminToken);

      console.log(`GET validation ${label}:`, validationResponse.status);

      assert(
        validationResponse.status === 400,
        `GET validation (${label}) should return 400, got ${validationResponse.status}`
      );
      assert(validationResponse.status !== 500, `GET validation (${label}) must not return 500`);
    }

    // --------------------------------------------------
    // O. GET /timetable/today
    // --------------------------------------------------

    const todayDow = getKolkataDayOfWeek();
    const otherDow = todayDow === 7 ? 1 : todayDow + 1;
    const todayFixtureIds = [];

    const todayFixtures = [
      {
        key: "faculty1-p8",
        faculty_id: facultyId,
        section: "A",
        day_of_week: todayDow,
        period: 8,
        room: "TODAY-A8",
        start_time: "08:00",
        end_time: "09:00",
      },
      {
        key: "faculty1-p10",
        faculty_id: facultyId,
        section: "A",
        day_of_week: todayDow,
        period: 10,
        room: "TODAY-A10",
        start_time: "10:00",
        end_time: "11:00",
      },
      {
        key: "faculty2-p9",
        faculty_id: facultyId2,
        section: "A",
        day_of_week: todayDow,
        period: 9,
        room: "TODAY-A9",
        start_time: "09:00",
        end_time: "10:00",
      },
      {
        key: "other-day",
        faculty_id: facultyId,
        section: "A",
        day_of_week: otherDow,
        period: 8,
        room: "OTHER-A8",
        start_time: "08:00",
        end_time: "09:00",
      },
      {
        key: "other-section",
        faculty_id: facultyId,
        section: "B",
        day_of_week: todayDow,
        period: 11,
        room: "TODAY-B11",
        start_time: "12:00",
        end_time: "13:00",
      },
    ];

    const todaySlotByKey = {};

    for (const fixture of todayFixtures) {
      const created = await request(
        "POST",
        "/timetable",
        {
          subject_id: subjectId,
          faculty_id: fixture.faculty_id,
          dept_id: departmentId,
          semester: 5,
          section: fixture.section,
          day_of_week: fixture.day_of_week,
          period: fixture.period,
          room: fixture.room,
          start_time: fixture.start_time,
          end_time: fixture.end_time,
        },
        adminToken
      );

      assert(
        created.status === 201,
        `Today fixture ${fixture.key} should create with 201 (got ${created.status})`
      );
      createdTimetableIds.push(created.data.slot.timetable_id);
      todayFixtureIds.push(created.data.slot.timetable_id);
      todaySlotByKey[fixture.key] = created.data.slot;
    }

    const adminTodayResponse = await request("GET", "/timetable/today", null, adminToken);

    console.log("GET today admin:", adminTodayResponse.status);

    assert(adminTodayResponse.status === 200, "ADMIN GET /today should return 200");
    assert(
      adminTodayResponse.data?.message === "Today's timetable fetched successfully",
      'ADMIN GET /today should return message "Today\'s timetable fetched successfully"'
    );
    assert(
      Array.isArray(adminTodayResponse.data?.timetable),
      "ADMIN GET /today needs timetable array"
    );
    assert(
      adminTodayResponse.data.timetable.every((entry) => entry.day_of_week === todayDow),
      "ADMIN GET /today should exclude other weekdays"
    );

    const adminTodayFixtures = adminTodayResponse.data.timetable.filter((entry) =>
      todayFixtureIds.includes(entry.timetable_id)
    );

    assert(
      adminTodayFixtures.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty1-p8"].timetable_id
      ),
      "ADMIN today response should include today's faculty1 period 8 fixture"
    );
    assert(
      adminTodayFixtures.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty2-p9"].timetable_id
      ),
      "ADMIN today response should include today's faculty2 period 9 fixture"
    );
    assert(
      !adminTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["other-day"].timetable_id
      ),
      "ADMIN today response should exclude other-weekday fixtures"
    );

    for (let i = 1; i < adminTodayResponse.data.timetable.length; i += 1) {
      const prev = adminTodayResponse.data.timetable[i - 1];
      const curr = adminTodayResponse.data.timetable[i];
      assert(
        prev.period <= curr.period,
        "ADMIN today timetable should be ordered by period ascending"
      );
    }

    const facultyTodayResponse = await request("GET", "/timetable/today", null, facultyToken);

    console.log("GET today faculty:", facultyTodayResponse.status);

    assert(facultyTodayResponse.status === 200, "FACULTY GET /today should return 200");
    assert(
      facultyTodayResponse.data.timetable.every(
        (entry) => entry.faculty_id === facultyId && entry.day_of_week === todayDow
      ),
      "FACULTY today slots must belong to that faculty on today's weekday"
    );
    assert(
      facultyTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty1-p8"].timetable_id
      ),
      "FACULTY today should include their period 8 slot"
    );
    assert(
      facultyTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty1-p10"].timetable_id
      ),
      "FACULTY today should include their period 10 slot"
    );
    assert(
      !facultyTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty2-p9"].timetable_id
      ),
      "FACULTY today should exclude another faculty member's slots"
    );
    assert(
      !facultyTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["other-day"].timetable_id
      ),
      "FACULTY today should exclude their other-weekday slots"
    );

    const facultyTodayPeriods = facultyTodayResponse.data.timetable
      .filter((entry) => todayFixtureIds.includes(entry.timetable_id))
      .map((entry) => entry.period);
    assert(
      facultyTodayPeriods.join(",") === "8,10" ||
        facultyTodayPeriods.every((period, index, all) => index === 0 || all[index - 1] <= period),
      "FACULTY today fixture periods should be ascending"
    );

    const studentTodayResponse = await request("GET", "/timetable/today", null, studentToken);

    console.log("GET today student:", studentTodayResponse.status);

    assert(studentTodayResponse.status === 200, "STUDENT GET /today should return 200");
    assert(
      studentTodayResponse.data.timetable.every(
        (entry) =>
          entry.dept_id === departmentId &&
          entry.semester === 5 &&
          entry.section === "A" &&
          entry.day_of_week === todayDow
      ),
      "STUDENT today slots must match profile dept/semester/section for today"
    );
    assert(
      studentTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty1-p8"].timetable_id
      ) &&
        studentTodayResponse.data.timetable.some(
          (entry) => entry.timetable_id === todaySlotByKey["faculty2-p9"].timetable_id
        ),
      "STUDENT today should include both faculty slots in their section"
    );
    assert(
      !studentTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["other-section"].timetable_id
      ),
      "STUDENT today should exclude other sections"
    );
    assert(
      !studentTodayResponse.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["other-day"].timetable_id
      ),
      "STUDENT today should exclude other weekdays"
    );

    const studentFixturePeriods = studentTodayResponse.data.timetable
      .filter((entry) => todayFixtureIds.includes(entry.timetable_id))
      .map((entry) => entry.period);
    assert(
      studentFixturePeriods.join(",") === "8,9,10",
      "STUDENT today fixtures should be ordered period 8,9,10"
    );

    await createTemporaryUser({
      email: emptyStudentEmail,
      name: "E2E Empty Today Student",
      role: "STUDENT",
      password: studentPassword,
    });

    const emptyStudentUser = await prisma.user.findUnique({
      where: { email: emptyStudentEmail },
    });

    const emptyStudentProfile = await request(
      "POST",
      "/students",
      {
        userId: emptyStudentUser.user_id,
        roll_number: rollNumberFor(testId, "E"),
        full_name: "E2E Empty Today Student",
        dept_id: departmentId,
        semester: 5,
        section: "U",
        admission_year: 2024,
        phone: "9876543299",
      },
      adminToken
    );

    assert(emptyStudentProfile.status === 201, "Empty-today student profile should return 201");

    const emptyStudentLogin = await request("POST", "/auth/login", {
      email: emptyStudentEmail,
      password: studentPassword,
    });

    assert(emptyStudentLogin.status === 200, "Empty-today student login should return 200");

    const emptyTodayResponse = await request(
      "GET",
      "/timetable/today",
      null,
      emptyStudentLogin.data.result.token
    );

    console.log("GET today empty student:", emptyTodayResponse.status);

    assert(emptyTodayResponse.status === 200, "Empty today timetable should return 200");
    assert(
      Array.isArray(emptyTodayResponse.data?.timetable) &&
        emptyTodayResponse.data.timetable.length === 0,
      "Empty today timetable should be an empty array, not an error"
    );

    const unauthToday = await request("GET", "/timetable/today");

    console.log("GET today no auth:", unauthToday.status);

    assert(unauthToday.status === 401, "Unauthenticated GET /today should return 401");

    const invalidToday = await request("GET", "/timetable/today", null, "not-a-real-jwt");

    console.log("GET today invalid token:", invalidToday.status);

    assert(invalidToday.status === 401, "Invalid token GET /today should return 401");
    assert(
      invalidToday.data?.message === "Invalid or expired token",
      'Invalid token GET /today should return message "Invalid or expired token"'
    );

    assert(process.env.JWT_SECRET, "JWT_SECRET must be available for expired-token test");
    const expiredToken = jwt.sign(
      { userId: studentUserId, role: "STUDENT" },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );
    const expiredToday = await request("GET", "/timetable/today", null, expiredToken);

    console.log("GET today expired token:", expiredToday.status);

    assert(expiredToday.status === 401, "Expired token GET /today should return 401");

    const guestToday = await request("GET", "/timetable/today", null, guestLogin.data.result.token);

    console.log("GET today unsupported role:", guestToday.status);

    assert(guestToday.status === 403, "Unsupported role GET /today should return 403");

    const orphanFacultyToday = await request(
      "GET",
      "/timetable/today",
      null,
      orphanFacultyLogin.data.result.token
    );

    console.log("GET today faculty missing profile:", orphanFacultyToday.status);

    assert(
      orphanFacultyToday.status === 404,
      "FACULTY without profile GET /today should return 404"
    );

    const studentMissingProfileTodayUser = await createTemporaryUser({
      email: `e2e.timetable.noprofile.student.${testId}@campusos.test`,
      name: "E2E No Profile Student",
      role: "STUDENT",
      password: studentPassword,
    });

    const noProfileStudentLogin = await request("POST", "/auth/login", {
      email: studentMissingProfileTodayUser.email,
      password: studentPassword,
    });

    assert(noProfileStudentLogin.status === 200, "No-profile student login should return 200");

    const noProfileStudentToday = await request(
      "GET",
      "/timetable/today",
      null,
      noProfileStudentLogin.data.result.token
    );

    console.log("GET today student missing profile:", noProfileStudentToday.status);

    assert(
      noProfileStudentToday.status === 404,
      "STUDENT without profile GET /today should return 404"
    );

    const spoofToday = await request(
      "GET",
      `/timetable/today?user_id=${facultyUserId}&faculty_id=${facultyId2}&dept_id=${otherDepartmentId}`,
      null,
      studentToken
    );

    console.log("GET today identity spoof attempt:", spoofToday.status);

    assert(
      spoofToday.status === 200,
      "Spoofed identity query should still authorize as the JWT user"
    );
    assert(
      spoofToday.data?.message === "Today's timetable fetched successfully",
      "Spoofed GET /today should keep the standard success message"
    );
    assert(
      Array.isArray(spoofToday.data?.timetable) && spoofToday.data.timetable.length > 0,
      "Spoofed GET /today must return the authenticated student's non-empty timetable"
    );
    assert(
      spoofToday.data.timetable.every(
        (entry) =>
          entry.dept_id === departmentId &&
          entry.semester === 5 &&
          entry.section === "A" &&
          entry.day_of_week === todayDow
      ),
      "Spoofed GET /today must still return only the authenticated student's scope"
    );

    const spoofIds = new Set(spoofToday.data.timetable.map((entry) => entry.timetable_id));
    assert(
      spoofIds.has(todaySlotByKey["faculty1-p8"].timetable_id) &&
        spoofIds.has(todaySlotByKey["faculty2-p9"].timetable_id) &&
        spoofIds.has(todaySlotByKey["faculty1-p10"].timetable_id),
      "Spoofed GET /today must still include the authenticated student's today fixtures"
    );
    assert(
      !spoofIds.has(todaySlotByKey["other-section"].timetable_id) &&
        !spoofIds.has(todaySlotByKey["other-day"].timetable_id),
      "Spoofed GET /today must not leak other-section or other-weekday slots"
    );

    // Prove the response is the student's timetable, not the spoofed faculty member's.
    const spoofedFacultyToday = await request("GET", "/timetable/today", null, facultyToken);
    assert(spoofedFacultyToday.status === 200, "Baseline faculty today fetch should return 200");
    const facultyOnlyIds = new Set(
      spoofedFacultyToday.data.timetable.map((entry) => entry.timetable_id)
    );
    assert(
      spoofIds.has(todaySlotByKey["faculty2-p9"].timetable_id) &&
        !facultyOnlyIds.has(todaySlotByKey["faculty2-p9"].timetable_id),
      "Spoofed student response must not collapse into faculty1's timetable"
    );

    const facultySpoofAsStudent = await request(
      "GET",
      `/timetable/today?user_id=${studentUserId}&dept_id=${departmentId}&section=A&semester=5`,
      null,
      facultyToken
    );

    console.log("GET today faculty spoof as student:", facultySpoofAsStudent.status);

    assert(
      facultySpoofAsStudent.status === 200,
      "Faculty spoofing a student user_id should still authorize as faculty"
    );
    assert(
      facultySpoofAsStudent.data.timetable.every(
        (entry) => entry.faculty_id === facultyId && entry.day_of_week === todayDow
      ),
      "Faculty spoof attempt must still return only that faculty member's today slots"
    );
    assert(
      !facultySpoofAsStudent.data.timetable.some(
        (entry) => entry.timetable_id === todaySlotByKey["faculty2-p9"].timetable_id
      ),
      "Faculty spoof attempt must not expose another faculty member's slots via query params"
    );
    assert(
      !Object.prototype.hasOwnProperty.call(spoofToday.data || {}, "stack") &&
        !Object.prototype.hasOwnProperty.call(facultySpoofAsStudent.data || {}, "stack"),
      "GET /today response should not expose a stack trace"
    );

    // --------------------------------------------------
    // P. Timetable exceptions and effective schedule
    // --------------------------------------------------

    const exceptionMonday = "2026-10-12";
    const exceptionTuesday = "2026-10-13";
    const exceptionThursday = "2026-10-15";

    const exceptionSlotResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "A",
        day_of_week: 1,
        period: 6,
        room: "EXC-1",
        start_time: "13:00",
        end_time: "14:00",
      },
      adminToken
    );

    assert(exceptionSlotResponse.status === 201, "Exception target slot should return 201");
    const exceptionSlotId = exceptionSlotResponse.data.slot.timetable_id;
    createdTimetableIds.push(exceptionSlotId);

    const cancelResponse = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "CANCELLED",
        original_date: exceptionMonday,
        reason: "Institute holiday",
      },
      adminToken
    );

    console.log("POST exception CANCELLED:", cancelResponse.status);

    assert(cancelResponse.status === 201, "Cancellation exception should return 201");
    assert(
      cancelResponse.data?.exception?.exception_type === "CANCELLED",
      "Cancellation should persist exception_type CANCELLED"
    );

    const weeklyAfterCancel = await request(
      "GET",
      timetableQuery({ dept_id: departmentId, semester: 5, section: "A" }),
      null,
      adminToken
    );

    assert(
      weeklyAfterCancel.data.timetable.some((entry) => entry.timetable_id === exceptionSlotId),
      "Weekly timetable must still contain the recurring slot after cancellation"
    );

    const effectiveCancelled = await request(
      "GET",
      `/timetable/effective?date=${exceptionMonday}&dept_id=${departmentId}&semester=5&section=A`,
      null,
      studentToken
    );

    console.log("GET effective after cancel:", effectiveCancelled.status);

    assert(effectiveCancelled.status === 200, "Effective timetable after cancel should return 200");
    assert(
      !effectiveCancelled.data.timetable.some((entry) => entry.timetable_id === exceptionSlotId),
      "Cancelled occurrence must be absent from the effective timetable"
    );

    const listExceptionsResponse = await request(
      "GET",
      `/timetable/${exceptionSlotId}/exceptions`,
      null,
      adminToken
    );

    assert(listExceptionsResponse.status === 200, "List exceptions should return 200");
    assert(
      listExceptionsResponse.data.exceptions.some(
        (entry) =>
          entry.timetable_exception_id === cancelResponse.data.exception.timetable_exception_id
      ),
      "Listed exceptions should include the cancellation"
    );

    const deleteCancelResponse = await request(
      "DELETE",
      `/timetable/exceptions/${cancelResponse.data.exception.timetable_exception_id}`,
      null,
      adminToken
    );

    assert(deleteCancelResponse.status === 200, "Delete cancellation should return 200");

    const roomChangeResponse = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "ROOM_TIME_CHANGE",
        original_date: exceptionMonday,
        room: "EXC-2",
        reason: "Projector failure",
      },
      adminToken
    );

    console.log("POST exception ROOM_TIME_CHANGE:", roomChangeResponse.status);

    assert(roomChangeResponse.status === 201, "Room/time change should return 201");

    const persistedSlot = await prisma.timetableSlot.findUnique({
      where: { timetable_id: exceptionSlotId },
    });

    assert(persistedSlot.room === "EXC-1", "Recurring slot room must remain unchanged");

    const effectiveRoomChange = await request(
      "GET",
      `/timetable/effective?date=${exceptionMonday}&dept_id=${departmentId}&semester=5&section=A`,
      null,
      adminToken
    );

    const changedOccurrence = effectiveRoomChange.data.timetable.find(
      (entry) => entry.timetable_id === exceptionSlotId
    );

    assert(
      changedOccurrence?.room === "EXC-2",
      "Effective occurrence should use the exception room"
    );
    assert(
      changedOccurrence?.start_time === "13:00",
      "Room-only change should keep original start time"
    );

    await request(
      "DELETE",
      `/timetable/exceptions/${roomChangeResponse.data.exception.timetable_exception_id}`,
      null,
      adminToken
    );

    const substituteResponse = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "FACULTY_SUBSTITUTION",
        original_date: exceptionMonday,
        replacement_faculty_id: facultyId2,
        reason: "Guest lecture",
      },
      adminToken
    );

    console.log("POST exception FACULTY_SUBSTITUTION:", substituteResponse.status);

    assert(substituteResponse.status === 201, "Faculty substitution should return 201");

    const effectiveSub = await request(
      "GET",
      `/timetable/effective?date=${exceptionMonday}`,
      null,
      adminToken
    );

    const substituted = effectiveSub.data.timetable.find(
      (entry) => entry.timetable_id === exceptionSlotId
    );

    assert(substituted?.faculty_id === facultyId2, "Effective faculty should be the replacement");
    assert(
      persistedSlot.faculty_id === facultyId,
      "Recurring faculty assignment must remain unchanged"
    );

    await request(
      "DELETE",
      `/timetable/exceptions/${substituteResponse.data.exception.timetable_exception_id}`,
      null,
      adminToken
    );

    const rescheduleResponse = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "RESCHEDULED",
        original_date: exceptionMonday,
        rescheduled_date: exceptionTuesday,
        room: "EXC-9",
        start_time: "15:00",
        end_time: "16:00",
      },
      adminToken
    );

    console.log("POST exception RESCHEDULED:", rescheduleResponse.status);

    assert(rescheduleResponse.status === 201, "Reschedule exception should return 201");

    const effectiveOriginal = await request(
      "GET",
      `/timetable/effective?date=${exceptionMonday}&dept_id=${departmentId}&semester=5&section=A`,
      null,
      adminToken
    );
    const effectiveDestination = await request(
      "GET",
      `/timetable/effective?date=${exceptionTuesday}&dept_id=${departmentId}&semester=5&section=A`,
      null,
      adminToken
    );

    assert(
      !effectiveOriginal.data.timetable.some((entry) => entry.timetable_id === exceptionSlotId),
      "Rescheduled occurrence must leave the original date"
    );
    assert(
      effectiveDestination.data.timetable.some(
        (entry) =>
          entry.timetable_id === exceptionSlotId &&
          entry.room === "EXC-9" &&
          entry.start_time === "15:00"
      ),
      "Rescheduled occurrence must appear on the destination date"
    );

    const studentEffectiveOtherSection = await request(
      "GET",
      `/timetable/effective?date=${exceptionTuesday}&dept_id=${departmentId}&semester=5&section=B`,
      null,
      studentToken
    );

    console.log("GET effective student spoof section:", studentEffectiveOtherSection.status);

    assert(
      studentEffectiveOtherSection.status === 403,
      "Student effective fetch for another section should return 403"
    );

    assertNoSensitiveFields(effectiveCancelled.data, "Student effective timetable");
    assertNoSensitiveFields(studentOwnGet.data, "Student weekly timetable");
    assertNoSensitiveFields(adminTodayResponse.data, "Admin today timetable");

    // --------------------------------------------------
    // P2. Exception read authorization
    // --------------------------------------------------

    const ownedReadDate = "2026-10-19"; // Monday; slot day_of_week=1, distinct from earlier fixtures
    const ownedCancelForRead = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "CANCELLED",
        original_date: ownedReadDate,
        reason: "Read-auth fixture",
      },
      adminToken
    );

    assert(
      ownedCancelForRead.status === 201,
      `Owned read-auth exception should return 201 (got ${ownedCancelForRead.status}: ${ownedCancelForRead.data?.message})`
    );
    const ownedExceptionId = ownedCancelForRead.data.exception.timetable_exception_id;

    const studentListOwnExceptions = await request(
      "GET",
      `/timetable/${exceptionSlotId}/exceptions`,
      null,
      studentToken
    );

    console.log("GET student list own exceptions:", studentListOwnExceptions.status);

    assert(studentListOwnExceptions.status === 200, "Student may list own-section exceptions");
    assert(
      Array.isArray(studentListOwnExceptions.data?.exceptions) &&
        studentListOwnExceptions.data.exceptions.every(
          (entry) => entry.timetable_id === exceptionSlotId
        ),
      "Student exception list must only contain the requested own-section slot"
    );
    assert(
      studentListOwnExceptions.data.exceptions.some(
        (entry) => entry.timetable_exception_id === ownedExceptionId
      ),
      "Student exception list must include the owned exception"
    );
    assertNoSensitiveFields(studentListOwnExceptions.data, "Student exception list");

    const studentGetOwnException = await request(
      "GET",
      `/timetable/exceptions/${ownedExceptionId}`,
      null,
      studentToken
    );

    console.log("GET student own exception:", studentGetOwnException.status);

    assert(studentGetOwnException.status === 200, "Student may fetch own-section exception");
    assert(
      studentGetOwnException.data?.exception?.timetable_exception_id === ownedExceptionId &&
        studentGetOwnException.data.exception.timetable?.dept_id === departmentId &&
        studentGetOwnException.data.exception.timetable?.section === "A",
      "Student exception payload must belong to their section slot"
    );
    assertNoSensitiveFields(studentGetOwnException.data, "Student exception detail");

    const otherSectionSlotResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 2,
        period: 6,
        room: "EXC-B",
        start_time: "13:00",
        end_time: "14:00",
      },
      adminToken
    );

    assert(otherSectionSlotResponse.status === 201, "Other-section slot should return 201");
    const otherSectionSlotId = otherSectionSlotResponse.data.slot.timetable_id;
    createdTimetableIds.push(otherSectionSlotId);

    const otherSectionExceptionResponse = await request(
      "POST",
      `/timetable/${otherSectionSlotId}/exceptions`,
      {
        exception_type: "CANCELLED",
        original_date: exceptionTuesday,
        reason: "Other section",
      },
      adminToken
    );

    assert(
      otherSectionExceptionResponse.status === 201,
      "Other-section exception should return 201"
    );
    const otherSectionExceptionId =
      otherSectionExceptionResponse.data.exception.timetable_exception_id;

    const studentListOtherSection = await request(
      "GET",
      `/timetable/${otherSectionSlotId}/exceptions`,
      null,
      studentToken
    );

    console.log("GET student other-section exceptions:", studentListOtherSection.status);

    assert(
      studentListOtherSection.status === 403,
      "Student must not list another section's exceptions"
    );

    const studentGetOtherSectionException = await request(
      "GET",
      `/timetable/exceptions/${otherSectionExceptionId}`,
      null,
      studentToken
    );

    console.log("GET student other-section exception:", studentGetOtherSectionException.status);

    assert(
      studentGetOtherSectionException.status === 403,
      "Student must not fetch another section's exception by ID"
    );

    const otherDeptSubjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCodeFor(testId, "OD"),
        subject_name: "E2E Other Dept Subject",
        dept_id: otherDepartmentId,
        semester: 5,
        credits: 3,
      },
      adminToken
    );

    assert(otherDeptSubjectResponse.status === 201, "Other-dept subject should return 201");
    const otherDeptSubjectId = otherDeptSubjectResponse.data.subject.subjectId;
    createdSubjectIds.push(otherDeptSubjectId);

    const otherDeptFacultyUser = await createTemporaryUser({
      email: `e2e.timetable.otherdept.faculty.${testId}@campusos.test`,
      name: "E2E Other Dept Faculty",
      role: "FACULTY",
      password: facultyPassword,
    });
    otherDeptFacultyUserId = otherDeptFacultyUser.user_id;

    const otherDeptFacultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: otherDeptFacultyUserId,
        employee_id: employeeIdFor(testId, "OD"),
        full_name: "E2E Other Dept Faculty",
        dept_id: otherDepartmentId,
        designation: "Assistant Professor",
        phone: "9000000099",
      },
      adminToken
    );

    assert(otherDeptFacultyResponse.status === 201, "Other-dept faculty should return 201");
    const otherDeptFacultyId = otherDeptFacultyResponse.data.faculty.facultyId;

    const otherDeptSlotResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: otherDeptSubjectId,
        faculty_id: otherDeptFacultyId,
        dept_id: otherDepartmentId,
        semester: 5,
        section: "A",
        day_of_week: 3,
        period: 6,
        room: "EXC-OD",
        start_time: "13:00",
        end_time: "14:00",
      },
      adminToken
    );

    assert(otherDeptSlotResponse.status === 201, "Other-dept slot should return 201");
    const otherDeptSlotId = otherDeptSlotResponse.data.slot.timetable_id;
    createdTimetableIds.push(otherDeptSlotId);

    const otherDeptExceptionResponse = await request(
      "POST",
      `/timetable/${otherDeptSlotId}/exceptions`,
      {
        exception_type: "CANCELLED",
        original_date: "2026-10-14",
        reason: "Other department",
      },
      adminToken
    );

    assert(otherDeptExceptionResponse.status === 201, "Other-dept exception should return 201");
    const otherDeptExceptionId = otherDeptExceptionResponse.data.exception.timetable_exception_id;

    const facultyListOtherDept = await request(
      "GET",
      `/timetable/${otherDeptSlotId}/exceptions`,
      null,
      facultyToken
    );

    console.log("GET faculty other-dept exceptions:", facultyListOtherDept.status);

    assert(
      facultyListOtherDept.status === 403,
      "Faculty must not list another department's exceptions"
    );

    const facultyGetOtherDeptException = await request(
      "GET",
      `/timetable/exceptions/${otherDeptExceptionId}`,
      null,
      facultyToken
    );

    console.log("GET faculty other-dept exception:", facultyGetOtherDeptException.status);

    assert(
      facultyGetOtherDeptException.status === 403,
      "Faculty must not fetch another department's exception by ID"
    );

    const facultyListOwnDept = await request(
      "GET",
      `/timetable/${exceptionSlotId}/exceptions`,
      null,
      facultyToken
    );

    assert(facultyListOwnDept.status === 200, "Faculty may list same-department exceptions");
    assert(
      facultyListOwnDept.data.exceptions.every((entry) => entry.timetable_id === exceptionSlotId),
      "Faculty same-dept exception list must match the requested slot"
    );

    const unauthListExceptions = await request("GET", `/timetable/${exceptionSlotId}/exceptions`);
    const unauthGetException = await request("GET", `/timetable/exceptions/${ownedExceptionId}`);
    const invalidGetException = await request(
      "GET",
      `/timetable/exceptions/${ownedExceptionId}`,
      null,
      "not-a-real-jwt"
    );

    assert(unauthListExceptions.status === 401, "Unauthenticated exception list should return 401");
    assert(unauthGetException.status === 401, "Unauthenticated exception get should return 401");
    assert(invalidGetException.status === 401, "Invalid token exception get should return 401");

    const guestListExceptions = await request(
      "GET",
      `/timetable/${exceptionSlotId}/exceptions`,
      null,
      guestLogin.data.result.token
    );

    assert(guestListExceptions.status === 403, "Unsupported role exception list should return 403");

    const studentSpoofExceptionPath = await request(
      "GET",
      `/timetable/exceptions/${otherSectionExceptionId}?user_id=${facultyUserId}&dept_id=${departmentId}&section=B`,
      null,
      studentToken
    );

    assert(
      studentSpoofExceptionPath.status === 403,
      "Query spoofing must not grant access to another section exception"
    );

    await request("DELETE", `/timetable/exceptions/${ownedExceptionId}`, null, adminToken);

    const unauthException = await request("POST", `/timetable/${exceptionSlotId}/exceptions`, {
      exception_type: "CANCELLED",
      original_date: exceptionMonday,
    });

    assert(unauthException.status === 401, "Unauthenticated exception create should return 401");

    const studentException = await request(
      "POST",
      `/timetable/${exceptionSlotId}/exceptions`,
      {
        exception_type: "CANCELLED",
        original_date: exceptionMonday,
      },
      studentToken
    );

    assert(studentException.status === 403, "Student exception create should return 403");

    const missingSlotException = await request(
      "POST",
      "/timetable/99999999/exceptions",
      {
        exception_type: "CANCELLED",
        original_date: exceptionMonday,
      },
      adminToken
    );

    assert(missingSlotException.status === 404, "Exception on missing slot should return 404");

    const concurrentExceptionOne = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "A",
        day_of_week: 4,
        period: 4,
        room: "EXA-4",
        start_time: "09:00",
        end_time: "10:00",
      },
      adminToken
    );
    const concurrentExceptionTwo = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId2,
        dept_id: departmentId,
        semester: 5,
        section: "B",
        day_of_week: 4,
        period: 5,
        room: "EXB-5",
        start_time: "11:00",
        end_time: "12:00",
      },
      adminToken
    );

    assert(
      concurrentExceptionOne.status === 201,
      "Concurrent exception slot one should return 201"
    );
    assert(
      concurrentExceptionTwo.status === 201,
      "Concurrent exception slot two should return 201"
    );
    createdTimetableIds.push(
      concurrentExceptionOne.data.slot.timetable_id,
      concurrentExceptionTwo.data.slot.timetable_id
    );

    const [raceOne, raceTwo] = await Promise.all([
      request(
        "POST",
        `/timetable/${concurrentExceptionOne.data.slot.timetable_id}/exceptions`,
        {
          exception_type: "ROOM_TIME_CHANGE",
          original_date: exceptionThursday,
          room: "EX-RACE",
          start_time: "09:00",
          end_time: "10:00",
        },
        adminToken
      ),
      request(
        "POST",
        `/timetable/${concurrentExceptionTwo.data.slot.timetable_id}/exceptions`,
        {
          exception_type: "ROOM_TIME_CHANGE",
          original_date: exceptionThursday,
          room: "EX-RACE",
          start_time: "09:00",
          end_time: "10:00",
        },
        adminToken
      ),
    ]);

    const raceStatuses = [raceOne.status, raceTwo.status].sort((a, b) => a - b);
    console.log("Concurrent exception room conflict:", raceStatuses.join(","));

    assert(
      raceStatuses[0] === 201 && raceStatuses[1] === 409,
      `Concurrent overlapping room exceptions should return one 201 and one 409 (got ${raceStatuses.join(",")} / ${raceOne.data?.message} | ${raceTwo.data?.message})`
    );

    // --------------------------------------------------
    // Q. Concurrent duplicate group-period
    // --------------------------------------------------

    const concurrentPayload = {
      subject_id: subjectId,
      faculty_id: facultyId,
      dept_id: departmentId,
      semester: 5,
      section: "Z",
      day_of_week: 1,
      period: 12,
      room: "CONC-1",
      start_time: "14:00",
      end_time: "15:00",
    };

    const [concurrentOne, concurrentTwo] = await Promise.all([
      request("POST", "/timetable", concurrentPayload, adminToken),
      request("POST", "/timetable", concurrentPayload, adminToken),
    ]);

    const statuses = [concurrentOne.status, concurrentTwo.status].sort((a, b) => a - b);

    console.log("Concurrent create:", statuses.join(","));

    assert(
      statuses[0] === 201 && statuses[1] === 409,
      "Concurrent duplicate group-period should return one 201 and one 409"
    );

    for (const response of [concurrentOne, concurrentTwo]) {
      if (response.status === 201 && response.data?.slot?.timetable_id) {
        createdTimetableIds.push(response.data.slot.timetable_id);
      }
    }

    const concurrentCount = await prisma.timetableSlot.count({
      where: {
        dept_id: departmentId,
        semester: 5,
        section: "Z",
        day_of_week: 1,
        period: 12,
      },
    });

    assert(concurrentCount === 1, "Concurrent duplicate should leave exactly one slot");

    console.log("\n✓ All Timetable API tests passed\n");
  } finally {
    await cleanupTestData({
      timetableIds: createdTimetableIds,
      subjectIds: createdSubjectIds,
      facultyUserIds: [facultyUserId, facultyUserId2, otherDeptFacultyUserId],
      departmentIds: [departmentId, otherDepartmentId],
      userEmails: [
        studentEmail,
        facultyEmail,
        facultyEmail2,
        orphanFacultyEmail,
        guestEmail,
        emptyStudentEmail,
        `e2e.timetable.noprofile.student.${testId}@campusos.test`,
        `e2e.timetable.otherdept.faculty.${testId}@campusos.test`,
        ephemeralAdminEmail,
      ],
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Timetable API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
