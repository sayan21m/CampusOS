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
  return `F${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId) {
  return `FD${String(testId).slice(-8)}`.slice(0, 10);
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
    const loginResponse = await request("POST", "/auth/login", {
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

  const email = `e2e.faculty.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Faculty Admin",
    role: "ADMINISTRATOR",
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

async function cleanupTestData({ facultyUserIds, departmentId, userEmails }) {
  const userIds = facultyUserIds.filter(Boolean);

  if (userIds.length > 0) {
    await prisma.faculty.deleteMany({
      where: {
        user_id: { in: userIds },
      },
    });
  }

  if (departmentId) {
    await prisma.department.deleteMany({
      where: { dept_id: departmentId },
    });
  }

  const emails = userEmails.filter(Boolean);

  if (emails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }
}

async function runTests() {
  console.log("\nRunning Faculty API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.faculty.${testId}@campusos.test`;
  const facultyEmail2 = `e2e.faculty2.${testId}@campusos.test`;
  const studentEmail = `e2e.faculty.student.${testId}@campusos.test`;
  const departmentName = `E2E Faculty Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const employeeId = employeeIdFor(testId);
  const employeeId2 = employeeIdFor(testId, "B");
  const password = "Faculty@123456";

  let facultyUserId = null;
  let facultyUserId2 = null;
  let studentUserId = null;
  let departmentId = null;
  let ephemeralAdminEmail = null;

  try {
    // --------------------------------------------------
    // 1. Create temporary FACULTY User
    // --------------------------------------------------

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Faculty User",
      role: "FACULTY",
      password,
    });

    facultyUserId = facultyUser.user_id;

    console.log("Create Faculty User:", facultyUserId ? "ok" : "failed");

    assert(facultyUserId, "Temporary FACULTY user should have user_id");

    // --------------------------------------------------
    // 2. Login Admin
    // --------------------------------------------------

    const adminAuth = await getAdminToken(testId);
    const adminToken = adminAuth.token;
    ephemeralAdminEmail = adminAuth.ephemeralAdminEmail;

    console.log("Login Admin: 200");

    assert(adminToken, "Admin login should return JWT token");

    // --------------------------------------------------
    // 3. Create Department
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

    // --------------------------------------------------
    // 4. Create Faculty
    // --------------------------------------------------

    const facultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Faculty Member",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Faculty:", facultyResponse.status);

    assert(facultyResponse.status === 201, "Faculty creation should return 201");

    // --------------------------------------------------
    // 5. Verify Faculty fields
    // --------------------------------------------------

    const faculty = facultyResponse.data.faculty;

    assert(faculty, "Response should contain faculty");
    assert(faculty.facultyId, "Faculty response should contain facultyId");
    assert(faculty.employeeId === employeeId, "Faculty response should contain correct employeeId");
    assert(
      faculty.userId === facultyUserId,
      "Faculty should be linked to the temporary FACULTY user"
    );
    assert(
      faculty.full_name === "E2E Faculty Member",
      "Faculty response should contain correct full_name"
    );
    assert(faculty.dept_id === departmentId, "Faculty response should contain correct dept_id");
    assert(
      faculty.designation === "Assistant Professor",
      "Faculty response should contain correct designation"
    );
    assert(faculty.phone === "9876543210", "Faculty response should contain correct phone");

    console.log("Verify Faculty: passed");

    // --------------------------------------------------
    // 6. Duplicate employee_id
    // --------------------------------------------------

    const facultyUser2 = await createTemporaryUser({
      email: facultyEmail2,
      name: "E2E Faculty User 2",
      role: "FACULTY",
      password,
    });

    facultyUserId2 = facultyUser2.user_id;

    const duplicateResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId2,
        employee_id: employeeId,
        full_name: "E2E Faculty Duplicate",
        dept_id: departmentId,
        designation: "Associate Professor",
        phone: "9876543211",
      },
      adminToken
    );

    console.log("Duplicate employee_id:", duplicateResponse.status);

    assert(duplicateResponse.status === 409, "Duplicate employee_id should return 409");

    assert(
      duplicateResponse.data?.message === "Employee ID already exists",
      'Duplicate employee_id should return message "Employee ID already exists"'
    );

    // --------------------------------------------------
    // 7. Wrong role (STUDENT user)
    // --------------------------------------------------

    const studentUser = await createTemporaryUser({
      email: studentEmail,
      name: "E2E Faculty Wrong Role Student",
      role: "STUDENT",
      password,
    });

    studentUserId = studentUser.user_id;

    const wrongRoleResponse = await request(
      "POST",
      "/faculty",
      {
        userId: studentUserId,
        employee_id: employeeId2,
        full_name: "E2E Wrong Role Faculty",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543212",
      },
      adminToken
    );

    console.log("Wrong role Faculty create:", wrongRoleResponse.status);

    assert(wrongRoleResponse.status === 403, "Creating Faculty for STUDENT user should return 403");

    assert(
      wrongRoleResponse.data?.message === "User must have FACULTY role",
      'Wrong role should return message "User must have FACULTY role"'
    );

    // --------------------------------------------------
    // 8. Nonexistent department
    // --------------------------------------------------

    const missingDeptResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId2,
        employee_id: employeeId2,
        full_name: "E2E Missing Dept Faculty",
        dept_id: 999999,
        designation: "Assistant Professor",
        phone: "9876543213",
      },
      adminToken
    );

    console.log("Nonexistent department:", missingDeptResponse.status);

    assert(missingDeptResponse.status === 404, "Nonexistent department should return 404");

    assert(
      missingDeptResponse.data?.message === "Department not found",
      'Nonexistent department should return message "Department not found"'
    );

    console.log("\n✓ All Faculty API tests passed\n");
  } finally {
    await cleanupTestData({
      facultyUserIds: [facultyUserId, facultyUserId2, studentUserId],
      departmentId,
      userEmails: [facultyEmail, facultyEmail2, studentEmail, ephemeralAdminEmail],
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Faculty API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
