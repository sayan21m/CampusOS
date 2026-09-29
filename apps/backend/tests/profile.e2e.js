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

function rollNumberFor(testId) {
  return `P${String(testId).slice(-8)}`;
}

function deptCodeFor(testId) {
  return `PD${String(testId).slice(-8)}`.slice(0, 10);
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

  const email = `e2e.profile.admin.${testId}@campusos.test`;
  const password = "Admin@123456";
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMINISTRATOR",
      isActive: true,
      passwordHash,
    },
    create: {
      name: "E2E Profile Admin",
      email,
      passwordHash,
      role: "ADMINISTRATOR",
    },
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

async function cleanupTestData({ studentUserId, departmentId, studentEmail, adminEmail }) {
  if (studentUserId) {
    await prisma.student.deleteMany({
      where: { user_id: studentUserId },
    });
  }

  if (departmentId) {
    await prisma.department.deleteMany({
      where: { dept_id: departmentId },
    });
  }

  const emails = [studentEmail, adminEmail].filter(Boolean);

  if (emails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }
}

async function runTests() {
  console.log("\nRunning Profile API tests...\n");

  const testId = Date.now();
  const studentEmail = `profile-test-${testId}@example.com`;
  const departmentName = `E2E Profile Department ${testId}`;
  const departmentCode = deptCodeFor(testId);

  let studentUserId = null;
  let departmentId = null;
  let ephemeralAdminEmail = null;

  try {
    // --------------------------------------------------
    // 1. Register Student
    // --------------------------------------------------

    const registerResponse = await request("POST", "/auth/register", {
      name: "Profile Test Student",
      email: studentEmail,
      password: "Student@123",
    });

    console.log("Register Student:", registerResponse.status);

    assert(registerResponse.status === 201, "Student registration should return 201");

    studentUserId = registerResponse.data.user.user_id;

    assert(studentUserId, "Registration response should contain user_id");

    // --------------------------------------------------
    // 2. Login Student
    // --------------------------------------------------

    const studentLoginResponse = await request("POST", "/auth/login", {
      email: studentEmail,
      password: "Student@123",
    });

    console.log("Login Student:", studentLoginResponse.status);

    assert(studentLoginResponse.status === 200, "Student login should return 200");

    const studentToken = studentLoginResponse.data.result.token;

    assert(studentToken, "Student login should return JWT token");

    // --------------------------------------------------
    // 3. Login Admin
    // --------------------------------------------------

    const adminAuth = await getAdminToken(testId);
    const adminToken = adminAuth.token;
    ephemeralAdminEmail = adminAuth.ephemeralAdminEmail;

    console.log("Login Admin: 200");

    assert(adminToken, "Admin login should return JWT token");

    // --------------------------------------------------
    // 4. Create Department
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
    // 5. Profile before Student record (negative case)
    // --------------------------------------------------

    const profileBeforeResponse = await request("GET", "/profile", null, studentToken);

    console.log("Profile before Student record:", profileBeforeResponse.status);

    assert(profileBeforeResponse.status === 404, "Profile before Student record should return 404");

    assert(
      profileBeforeResponse.data?.message === "Student not found",
      'Profile before Student record should return message "Student not found"'
    );

    // --------------------------------------------------
    // 6. Create Student Profile
    // --------------------------------------------------

    const studentResponse = await request(
      "POST",
      "/students",
      {
        userId: studentUserId,
        roll_number: rollNumberFor(testId),
        full_name: "Profile Test Student",
        dept_id: departmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Student Profile:", studentResponse.status);

    assert(studentResponse.status === 201, "Student profile creation should return 201");

    assert(
      studentResponse.data?.student?.userId === studentUserId,
      "Created Student profile should be linked to the registered Student user_id"
    );

    // --------------------------------------------------
    // 7. Get My Profile
    // --------------------------------------------------

    const profileResponse = await request("GET", "/profile", null, studentToken);

    console.log("Get My Profile:", profileResponse.status);

    assert(profileResponse.status === 200, "Get profile should return 200");

    // --------------------------------------------------
    // 8. Verify Profile
    // --------------------------------------------------

    const profile = profileResponse.data.profile;

    assert(profile, "Response should contain profile");

    assert(profile.userId === studentUserId, "Profile should belong to the logged-in user");

    assert(
      profile.full_name === "Profile Test Student",
      "Profile should contain correct full name"
    );

    assert(profile.email === studentEmail, "Profile should contain correct email");

    assert(profile.role === "STUDENT", "Profile should contain STUDENT role");

    assert(profile.accountStatus === true, "Profile should contain accountStatus true");

    assert(profile.department, "Profile should contain nested department");

    assert(
      profile.department.dept_id === departmentId,
      "Profile department should contain correct dept_id"
    );

    assert(
      profile.department.dept_name === departmentName,
      "Profile department should contain correct dept_name"
    );

    assert(
      profile.department.dept_code === departmentCode,
      "Profile department should contain correct dept_code"
    );

    assert(profile.semester === 5, "Profile should contain correct semester");

    assert(profile.section === "A", "Profile should contain correct section");

    assert(profile.admission_year === 2024, "Profile should contain correct admission_year");

    assert(profile.phone === "9876543210", "Profile should contain correct phone");

    console.log("Verify Profile: passed");

    console.log("\n✓ All Profile API tests passed\n");
  } finally {
    await cleanupTestData({
      studentUserId,
      departmentId,
      studentEmail,
      adminEmail: ephemeralAdminEmail,
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Profile API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
