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

function deptCodeFor(testId, prefix = "PD") {
  return `${prefix}${String(testId).slice(-8)}`.slice(0, 10);
}

function employeeIdFor(testId, suffix = "") {
  return `F${String(testId).slice(-8)}${suffix}`.slice(0, 15);
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

async function cleanupTestData({ studentUserId, facultyUserIds, departmentIds, userEmails }) {
  if (studentUserId) {
    await prisma.student.deleteMany({
      where: { user_id: studentUserId },
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

  const deptIds = (departmentIds || []).filter(Boolean);

  if (deptIds.length > 0) {
    await prisma.department.deleteMany({
      where: {
        dept_id: { in: deptIds },
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

async function runTests() {
  console.log("\nRunning Profile API tests...\n");

  const testId = Date.now();
  const studentEmail = `profile-test-${testId}@example.com`;
  const facultyEmail = `e2e.profile.faculty.${testId}@campusos.test`;
  const facultyNoProfileEmail = `e2e.profile.faculty.noprof.${testId}@campusos.test`;
  const facultyPassword = "Faculty@123456";

  const departmentName = `E2E Profile Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const facultyDepartmentName = `E2E Faculty Profile Dept ${testId}`;
  const facultyDepartmentCode = deptCodeFor(testId, "PF");
  const employeeId = employeeIdFor(testId);

  let studentUserId = null;
  let facultyUserId = null;
  let facultyNoProfileUserId = null;
  let departmentId = null;
  let facultyDepartmentId = null;
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
    // 7. Get My Profile (Student)
    // --------------------------------------------------

    const profileResponse = await request("GET", "/profile", null, studentToken);

    console.log("Get My Profile:", profileResponse.status);

    assert(profileResponse.status === 200, "Get profile should return 200");

    // --------------------------------------------------
    // 8. Verify Student Profile
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

    // --------------------------------------------------
    // 9. Faculty profile before Faculty record (negative)
    // --------------------------------------------------

    const facultyNoProfileUser = await createTemporaryUser({
      email: facultyNoProfileEmail,
      name: "E2E Faculty No Profile",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyNoProfileUserId = facultyNoProfileUser.user_id;

    const facultyNoProfileLogin = await request("POST", "/auth/login", {
      email: facultyNoProfileEmail,
      password: facultyPassword,
    });

    console.log("Login Faculty without profile:", facultyNoProfileLogin.status);

    assert(facultyNoProfileLogin.status === 200, "Faculty without profile login should return 200");

    const facultyNoProfileToken = facultyNoProfileLogin.data.result.token;

    const facultyBeforeResponse = await request("GET", "/profile", null, facultyNoProfileToken);

    console.log("Profile before Faculty record:", facultyBeforeResponse.status);

    assert(facultyBeforeResponse.status === 404, "Profile before Faculty record should return 404");

    assert(
      facultyBeforeResponse.data?.message === "Faculty not found",
      'Profile before Faculty record should return message "Faculty not found"'
    );

    // --------------------------------------------------
    // 10. Create temporary FACULTY user
    // --------------------------------------------------

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Faculty Member",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId = facultyUser.user_id;

    console.log("Create Faculty User:", facultyUserId ? "ok" : "failed");

    assert(facultyUserId, "Temporary FACULTY user should have user_id");

    // --------------------------------------------------
    // 11. Create Faculty Department
    // --------------------------------------------------

    const facultyDepartmentResponse = await request(
      "POST",
      "/departments",
      {
        dept_name: facultyDepartmentName,
        dept_code: facultyDepartmentCode,
      },
      adminToken
    );

    console.log("Create Faculty Department:", facultyDepartmentResponse.status);

    assert(
      facultyDepartmentResponse.status === 201,
      "Faculty department creation should return 201"
    );

    facultyDepartmentId = facultyDepartmentResponse.data.department.dept_id;

    assert(facultyDepartmentId, "Faculty department response should contain dept_id");

    // --------------------------------------------------
    // 12. Create Faculty Profile
    // --------------------------------------------------

    const facultyCreateResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Faculty Member",
        dept_id: facultyDepartmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Faculty Profile:", facultyCreateResponse.status);

    assert(facultyCreateResponse.status === 201, "Faculty profile creation should return 201");

    assert(
      facultyCreateResponse.data?.faculty?.userId === facultyUserId,
      "Created Faculty profile should be linked to the temporary FACULTY user_id"
    );

    // --------------------------------------------------
    // 13. Login Faculty
    // --------------------------------------------------

    const facultyLoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });

    console.log("Login Faculty:", facultyLoginResponse.status);

    assert(facultyLoginResponse.status === 200, "Faculty login should return 200");

    const facultyToken = facultyLoginResponse.data.result.token;

    assert(facultyToken, "Faculty login should return JWT token");

    // --------------------------------------------------
    // 14. Get Faculty Profile
    // --------------------------------------------------

    const facultyProfileResponse = await request("GET", "/profile", null, facultyToken);

    console.log("Get Faculty Profile:", facultyProfileResponse.status);

    assert(facultyProfileResponse.status === 200, "Get Faculty profile should return 200");

    // --------------------------------------------------
    // 15. Verify Faculty Profile
    // --------------------------------------------------

    const facultyProfile = facultyProfileResponse.data.profile;

    assert(facultyProfile, "Faculty response should contain profile");

    assert(facultyProfile.facultyId, "Faculty profile should contain facultyId");
    assert(
      facultyProfile.userId === facultyUserId,
      "Faculty profile should belong to the temporary Faculty user"
    );
    assert(
      facultyProfile.employeeId === employeeId,
      "Faculty profile should contain correct employeeId"
    );
    assert(
      facultyProfile.full_name === "E2E Faculty Member",
      "Faculty profile should contain correct full_name"
    );
    assert(facultyProfile.email === facultyEmail, "Faculty profile should contain correct email");
    assert(facultyProfile.role === "FACULTY", "Faculty profile should contain FACULTY role");
    assert(
      facultyProfile.accountStatus === true,
      "Faculty profile should contain accountStatus true"
    );
    assert(facultyProfile.department, "Faculty profile should contain nested department");
    assert(
      facultyProfile.department.dept_id === facultyDepartmentId,
      "Faculty department should contain correct dept_id"
    );
    assert(
      facultyProfile.department.dept_name === facultyDepartmentName,
      "Faculty department should contain correct dept_name"
    );
    assert(
      facultyProfile.department.dept_code === facultyDepartmentCode,
      "Faculty department should contain correct dept_code"
    );
    assert(
      facultyProfile.designation === "Assistant Professor",
      "Faculty profile should contain correct designation"
    );
    assert(facultyProfile.phone === "9876543210", "Faculty profile should contain correct phone");
    assert(
      Object.prototype.hasOwnProperty.call(facultyProfile, "photo_url"),
      "Faculty profile should contain photo_url field"
    );

    console.log("Verify Faculty Profile: passed");

    console.log("\n✓ All Profile API tests passed\n");
  } finally {
    await cleanupTestData({
      studentUserId,
      facultyUserIds: [facultyUserId, facultyNoProfileUserId],
      departmentIds: [departmentId, facultyDepartmentId],
      userEmails: [studentEmail, facultyEmail, facultyNoProfileEmail, ephemeralAdminEmail],
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
