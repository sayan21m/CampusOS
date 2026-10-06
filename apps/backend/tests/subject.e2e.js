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

function subjectCodeFor(testId, suffix = "") {
  return `S${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId) {
  return `SD${String(testId).slice(-8)}`.slice(0, 10);
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

  const email = `e2e.subject.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Subject Admin",
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

async function cleanupTestData({ subjectCodes, departmentId, userEmails }) {
  const codes = (subjectCodes || []).filter(Boolean);

  if (codes.length > 0) {
    await prisma.subject.deleteMany({
      where: {
        subject_code: { in: codes },
      },
    });
  }

  if (departmentId) {
    await prisma.department.deleteMany({
      where: { dept_id: departmentId },
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
  console.log("\nRunning Subject API tests...\n");

  const testId = Date.now();
  const studentEmail = `e2e.subject.student.${testId}@campusos.test`;
  const departmentName = `E2E Subject Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const subjectCode = subjectCodeFor(testId);
  const subjectCodeAlt = subjectCodeFor(testId, "B");
  const studentPassword = "Student@123";

  let departmentId = null;
  let ephemeralAdminEmail = null;
  const createdSubjectCodes = [];

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

    // --------------------------------------------------
    // A. Admin can create a subject
    // --------------------------------------------------

    const createResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "Test Subject",
        dept_id: departmentId,
        semester: 5,
        credits: 4,
      },
      adminToken
    );

    console.log("Create Subject:", createResponse.status);

    assert(createResponse.status === 201, "Subject creation should return 201");

    createdSubjectCodes.push(subjectCode);

    const subject = createResponse.data.subject;

    assert(subject, "Response should contain subject");
    assert(subject.subjectId, "Subject response should contain subjectId");
    assert(
      subject.subject_code === subjectCode,
      "Subject response should contain correct subject_code"
    );
    assert(
      subject.subject_name === "Test Subject",
      "Subject response should contain correct subject_name"
    );
    assert(subject.dept_id === departmentId, "Subject response should contain correct dept_id");
    assert(subject.semester === 5, "Subject response should contain semester 5");
    assert(subject.credits === 4, "Subject response should contain credits 4");
    assert(subject.is_active === true, "Subject response should default is_active to true");

    console.log("Verify Subject: passed");

    // --------------------------------------------------
    // B. Student cannot create a subject
    // --------------------------------------------------

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Subject Student",
      email: studentEmail,
      password: studentPassword,
    });

    assert(registerResponse.status === 201, "Student registration should return 201");

    const studentLoginResponse = await request("POST", "/auth/login", {
      email: studentEmail,
      password: studentPassword,
    });

    assert(studentLoginResponse.status === 200, "Student login should return 200");

    const studentToken = studentLoginResponse.data.result.token;

    const studentCreateResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCodeAlt,
        subject_name: "Student Forbidden Subject",
        dept_id: departmentId,
        semester: 3,
        credits: 3,
      },
      studentToken
    );

    console.log("Student Subject Create:", studentCreateResponse.status);

    assert(studentCreateResponse.status === 403, "Student subject creation should return 403");

    assert(
      studentCreateResponse.data?.message === "Access denied",
      'Student subject creation should return message "Access denied"'
    );

    // --------------------------------------------------
    // C. Duplicate subject_code
    // --------------------------------------------------

    const duplicateResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "Duplicate Subject",
        dept_id: departmentId,
        semester: 5,
        credits: 4,
      },
      adminToken
    );

    console.log("Duplicate subject_code:", duplicateResponse.status);

    assert(duplicateResponse.status === 409, "Duplicate subject_code should return 409");

    assert(
      duplicateResponse.data?.message === "Subject code already exists",
      'Duplicate subject_code should return message "Subject code already exists"'
    );

    // --------------------------------------------------
    // D. Non-existent Department
    // --------------------------------------------------

    const missingDeptResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCodeAlt,
        subject_name: "Missing Department Subject",
        dept_id: 999999,
        semester: 5,
        credits: 4,
      },
      adminToken
    );

    console.log("Nonexistent department:", missingDeptResponse.status);

    assert(missingDeptResponse.status === 404, "Nonexistent department should return 404");

    assert(
      missingDeptResponse.data?.message === "Department not found",
      'Nonexistent department should return message "Department not found"'
    );

    // --------------------------------------------------
    // E. Validation failure
    // --------------------------------------------------

    const validationResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: "",
        subject_name: "X",
        dept_id: departmentId,
        semester: 10,
        credits: 0,
      },
      adminToken
    );

    console.log("Validation failure:", validationResponse.status);

    assert(validationResponse.status === 400, "Invalid subject data should return 400");

    assert(
      validationResponse.data?.message === "Validation failed",
      'Invalid subject data should return message "Validation failed"'
    );

    assert(
      Array.isArray(validationResponse.data?.errors) && validationResponse.data.errors.length > 0,
      "Validation failure should include errors array"
    );

    // --------------------------------------------------
    // F. Authentication
    // --------------------------------------------------

    const unauthResponse = await request("POST", "/subjects", {
      subject_code: subjectCodeAlt,
      subject_name: "Unauth Subject",
      dept_id: departmentId,
      semester: 5,
      credits: 4,
    });

    console.log("No Authorization:", unauthResponse.status);

    assert(unauthResponse.status === 401, "Unauthenticated subject creation should return 401");

    assert(
      unauthResponse.data?.message === "Authentication required",
      'Unauthenticated subject creation should return message "Authentication required"'
    );

    console.log("\n✓ All Subject API tests passed\n");
  } finally {
    await cleanupTestData({
      subjectCodes: createdSubjectCodes,
      departmentId,
      userEmails: [studentEmail, ephemeralAdminEmail],
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Subject API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
