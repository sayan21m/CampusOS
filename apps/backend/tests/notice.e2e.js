import "dotenv/config";
import prisma from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";

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

function employeeIdFor(testId, suffix = "") {
  return `N${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId, prefix = "ND") {
  return `${prefix}${String(testId).slice(-8)}`.slice(0, 10);
}

function rollNumberFor(testId, suffix = "") {
  return `NR${String(testId).slice(-8)}${suffix}`.slice(0, 20);
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

  const email = `e2e.notice.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Notice Admin",
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
  noticeIds,
  facultyUserIds,
  studentUserIds,
  departmentIds,
  userEmails,
}) {
  const notices = (noticeIds || []).filter(Boolean);

  if (notices.length > 0) {
    await prisma.notice.deleteMany({
      where: {
        notice_id: { in: notices },
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

  const studentIds = (studentUserIds || []).filter(Boolean);

  if (studentIds.length > 0) {
    await prisma.student.deleteMany({
      where: {
        user_id: { in: studentIds },
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

  const emails = (userEmails || []).filter(Boolean);

  if (emails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }
}

function noticeIdsFrom(list) {
  return (list || []).map((item) => item.notice_id).sort((a, b) => a - b);
}

async function runTests() {
  console.log("\nRunning Notice API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.notice.faculty.${testId}@campusos.test`;
  const studentEmail = `e2e.notice.student.${testId}@campusos.test`;
  const departmentName = `E2E Notice Department ${testId}`;
  const otherDepartmentName = `E2E Notice Other Dept ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const otherDepartmentCode = deptCodeFor(testId, "NO");
  const employeeId = employeeIdFor(testId);
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";

  let facultyUserId = null;
  let studentUserId = null;
  let departmentId = null;
  let otherDepartmentId = null;
  let ephemeralAdminEmail = null;
  const createdNoticeIds = [];

  try {
    // --------------------------------------------------
    // Setup: faculty user, admin, departments, profiles
    // --------------------------------------------------

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Notice Faculty",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId = facultyUser.user_id;
    assert(facultyUserId, "Temporary FACULTY user should have user_id");

    const adminAuth = await getAdminToken(testId);
    const adminToken = adminAuth.token;
    ephemeralAdminEmail = adminAuth.ephemeralAdminEmail;

    console.log("Login Admin: 200");
    assert(adminToken, "Admin login should return JWT token");

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

    console.log("Create Other Department:", otherDepartmentResponse.status);
    assert(otherDepartmentResponse.status === 201, "Other department creation should return 201");

    otherDepartmentId = otherDepartmentResponse.data.department.dept_id;
    assert(otherDepartmentId, "Other department response should contain dept_id");

    const facultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Notice Faculty Member",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Faculty Profile:", facultyResponse.status);
    assert(facultyResponse.status === 201, "Faculty creation should return 201");

    const facultyLoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });

    assert(facultyLoginResponse.status === 200, "Faculty login should return 200");
    const facultyToken = facultyLoginResponse.data.result.token;
    assert(facultyToken, "Faculty login should return JWT token");
    console.log("Login Faculty: 200");

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Notice Student",
      email: studentEmail,
      password: studentPassword,
    });

    assert(registerResponse.status === 201, "Student registration should return 201");
    studentUserId = registerResponse.data.user.user_id;

    const studentProfileResponse = await request(
      "POST",
      "/students",
      {
        userId: studentUserId,
        roll_number: rollNumberFor(testId),
        full_name: "E2E Notice Student",
        dept_id: departmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543211",
      },
      adminToken
    );

    console.log("Create Student Profile:", studentProfileResponse.status);
    assert(studentProfileResponse.status === 201, "Student profile creation should return 201");

    const studentLoginResponse = await request("POST", "/auth/login", {
      email: studentEmail,
      password: studentPassword,
    });

    assert(studentLoginResponse.status === 200, "Student login should return 200");
    const studentToken = studentLoginResponse.data.result.token;
    assert(studentToken, "Student login should return JWT token");
    console.log("Login Student: 200");

    // --------------------------------------------------
    // 1. Unauthenticated create is rejected
    // --------------------------------------------------

    const unauthCreate = await request("POST", "/notices", {
      title: "No Auth",
      content: "Should fail",
      category: "academic",
      priority: "normal",
      target_type: "all",
      target_value: "campus",
    });

    console.log("Create Notice (no auth):", unauthCreate.status);
    assert(unauthCreate.status === 401, "Unauthenticated create should return 401");

    // --------------------------------------------------
    // 2. Student cannot create notices
    // --------------------------------------------------

    const studentCreate = await request(
      "POST",
      "/notices",
      {
        title: "Student Notice",
        content: "Students cannot post",
        category: "academic",
        priority: "normal",
        target_type: "all",
        target_value: "campus",
      },
      studentToken
    );

    console.log("Create Notice (student):", studentCreate.status);
    assert(studentCreate.status === 403, "Student create should return 403");

    // --------------------------------------------------
    // 3. Invalid payload fails validation
    // --------------------------------------------------

    const invalidCreate = await request(
      "POST",
      "/notices",
      {
        title: "",
        content: "Missing fields",
      },
      facultyToken
    );

    console.log("Create Notice (invalid):", invalidCreate.status);
    assert(invalidCreate.status === 400, "Invalid create payload should return 400");
    assert(
      invalidCreate.data?.message === "Validation failed",
      'Invalid create should return message "Validation failed"'
    );

    // --------------------------------------------------
    // 4. Faculty creates an all-campus notice
    // --------------------------------------------------

    const allNoticeResponse = await request(
      "POST",
      "/notices",
      {
        title: `E2E All Notice ${testId}`,
        content: "Campus-wide notice for e2e.",
        category: "event",
        priority: "important",
        target_type: "all",
        target_value: "everyone",
      },
      facultyToken
    );

    console.log("Create All Notice (faculty):", allNoticeResponse.status);
    assert(allNoticeResponse.status === 201, "Faculty all-notice creation should return 201");

    const allNotice = allNoticeResponse.data.notice;
    assert(allNotice?.notice_id, "All notice should include notice_id");
    createdNoticeIds.push(allNotice.notice_id);
    assert(allNotice.target_type === "all", "All notice target_type should be all");
    assert(allNotice.target_value === "ALL", "All notice target_value should normalize to ALL");

    // --------------------------------------------------
    // 5. Faculty creates a department notice for own dept
    // --------------------------------------------------

    const deptNoticeResponse = await request(
      "POST",
      "/notices",
      {
        title: `E2E Dept Notice ${testId}`,
        content: "Department notice for e2e.",
        category: "academic",
        priority: "normal",
        target_type: "dept",
        target_value: String(departmentId),
      },
      facultyToken
    );

    console.log("Create Dept Notice (faculty):", deptNoticeResponse.status);
    assert(deptNoticeResponse.status === 201, "Faculty dept-notice creation should return 201");

    const deptNotice = deptNoticeResponse.data.notice;
    createdNoticeIds.push(deptNotice.notice_id);
    assert(
      deptNotice.target_value === String(departmentId),
      "Dept notice target_value should match faculty department"
    );

    // --------------------------------------------------
    // 6. Faculty cannot target another department
    // --------------------------------------------------

    const otherDeptNoticeResponse = await request(
      "POST",
      "/notices",
      {
        title: `E2E Other Dept Notice ${testId}`,
        content: "Should be forbidden.",
        category: "academic",
        priority: "normal",
        target_type: "dept",
        target_value: String(otherDepartmentId),
      },
      facultyToken
    );

    console.log("Create Other Dept Notice (faculty):", otherDeptNoticeResponse.status);
    assert(
      otherDeptNoticeResponse.status === 403,
      "Faculty targeting another department should return 403"
    );
    assert(
      otherDeptNoticeResponse.data?.message === "You can only target your own department",
      'Cross-department faculty create should return "You can only target your own department"'
    );

    // --------------------------------------------------
    // 7. Admin creates year and section notices
    // --------------------------------------------------

    const yearNoticeResponse = await request(
      "POST",
      "/notices",
      {
        title: `E2E Year Notice ${testId}`,
        content: "Year 3 notice for e2e.",
        category: "exam",
        priority: "urgent",
        target_type: "year",
        target_value: "3",
      },
      adminToken
    );

    console.log("Create Year Notice (admin):", yearNoticeResponse.status);
    assert(yearNoticeResponse.status === 201, "Admin year-notice creation should return 201");

    const yearNotice = yearNoticeResponse.data.notice;
    createdNoticeIds.push(yearNotice.notice_id);
    assert(yearNotice.target_type === "year", "Year notice target_type should be year");
    assert(yearNotice.target_value === "3", "Year notice target_value should be 3");

    const sectionNoticeResponse = await request(
      "POST",
      "/notices",
      {
        title: `E2E Section Notice ${testId}`,
        content: "Section A notice for e2e.",
        category: "holiday",
        priority: "normal",
        target_type: "section",
        target_value: ` ${departmentId} : A `,
      },
      adminToken
    );

    console.log("Create Section Notice (admin):", sectionNoticeResponse.status);
    assert(sectionNoticeResponse.status === 201, "Admin section-notice creation should return 201");

    const sectionNotice = sectionNoticeResponse.data.notice;
    createdNoticeIds.push(sectionNotice.notice_id);
    assert(
      sectionNotice.target_value === `${departmentId}:A`,
      "Section notice target_value should be normalized"
    );

    // --------------------------------------------------
    // 8. Unauthenticated get is rejected
    // --------------------------------------------------

    const unauthGet = await request("GET", "/notices");
    console.log("Get Notices (no auth):", unauthGet.status);
    assert(unauthGet.status === 401, "Unauthenticated get should return 401");

    // --------------------------------------------------
    // 9. Admin receives all created notices
    // --------------------------------------------------

    const adminGet = await request("GET", "/notices", null, adminToken);
    console.log("Get Notices (admin):", adminGet.status);
    assert(adminGet.status === 200, "Admin get notices should return 200");
    assert(Array.isArray(adminGet.data?.notice), "Admin get should return notice array");

    const adminIds = noticeIdsFrom(adminGet.data.notice);
    for (const noticeId of createdNoticeIds) {
      assert(adminIds.includes(noticeId), `Admin notice list should include notice ${noticeId}`);
    }

    // --------------------------------------------------
    // 10. Faculty receives all + own department notices
    // --------------------------------------------------

    const facultyGet = await request("GET", "/notices", null, facultyToken);
    console.log("Get Notices (faculty):", facultyGet.status);
    assert(facultyGet.status === 200, "Faculty get notices should return 200");

    const facultyIds = noticeIdsFrom(facultyGet.data.notice);
    assert(facultyIds.includes(allNotice.notice_id), "Faculty should see all-campus notice");
    assert(facultyIds.includes(deptNotice.notice_id), "Faculty should see own department notice");
    assert(
      !facultyIds.includes(yearNotice.notice_id),
      "Faculty should not see student year notices"
    );
    assert(
      !facultyIds.includes(sectionNotice.notice_id),
      "Faculty should not see student section notices"
    );

    // --------------------------------------------------
    // 11. Student receives matching all/dept/year/section notices
    // --------------------------------------------------

    const studentGet = await request("GET", "/notices", null, studentToken);
    console.log("Get Notices (student):", studentGet.status);
    assert(studentGet.status === 200, "Student get notices should return 200");

    const studentIds = noticeIdsFrom(studentGet.data.notice);
    assert(studentIds.includes(allNotice.notice_id), "Student should see all-campus notice");
    assert(studentIds.includes(deptNotice.notice_id), "Student should see department notice");
    assert(studentIds.includes(yearNotice.notice_id), "Student should see year-3 notice");
    assert(studentIds.includes(sectionNotice.notice_id), "Student should see section A notice");

    const studentOrdered = studentGet.data.notice.filter((item) =>
      createdNoticeIds.includes(item.notice_id)
    );
    const priorities = studentOrdered.map((item) => item.priority);
    const urgentIndex = priorities.indexOf("urgent");
    const importantIndex = priorities.indexOf("important");
    const normalIndex = priorities.indexOf("normal");

    assert(urgentIndex !== -1, "Student list should include urgent notice");
    assert(
      urgentIndex < importantIndex || importantIndex === -1,
      "Urgent notices should rank above important"
    );
    assert(
      importantIndex === -1 || normalIndex === -1 || importantIndex < normalIndex,
      "Important notices should rank above normal"
    );

    console.log("\n✓ All Notice API tests passed\n");
  } finally {
    await cleanupTestData({
      noticeIds: createdNoticeIds,
      facultyUserIds: [facultyUserId],
      studentUserIds: [studentUserId],
      departmentIds: [departmentId, otherDepartmentId],
      userEmails: [facultyEmail, studentEmail, ephemeralAdminEmail],
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Notice API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
