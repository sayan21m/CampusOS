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
  return `A${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId) {
  return `AD${String(testId).slice(-8)}`.slice(0, 10);
}

function subjectCodeFor(testId, suffix = "") {
  return `AS${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function futureDeadline(daysAhead = 7) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(23, 59, 0, 0);
  return date.toISOString();
}

function pastDeadline() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 2);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
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

  const email = `e2e.assignment.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Assignment Admin",
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

async function cleanupTestData({
  assignmentIds,
  subjectCodes,
  facultyUserIds,
  departmentId,
  userEmails,
}) {
  const ids = (assignmentIds || []).filter(Boolean);

  if (ids.length > 0) {
    await prisma.assignment.deleteMany({
      where: {
        assignment_id: { in: ids },
      },
    });
  }

  const codes = (subjectCodes || []).filter(Boolean);

  if (codes.length > 0) {
    await prisma.subject.deleteMany({
      where: {
        subject_code: { in: codes },
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
  console.log("\nRunning Assignment API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.assignment.faculty.${testId}@campusos.test`;
  const facultyEmail2 = `e2e.assignment.faculty2.${testId}@campusos.test`;
  const facultyNoProfileEmail = `e2e.assignment.faculty.noprofile.${testId}@campusos.test`;
  const studentEmail = `e2e.assignment.student.${testId}@campusos.test`;
  const departmentName = `E2E Assignment Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const subjectCode = subjectCodeFor(testId);
  const employeeId = employeeIdFor(testId);
  const employeeId2 = employeeIdFor(testId, "B");
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";
  const deadline = futureDeadline(10);
  const title = `E2E Assignment ${testId}`;

  let departmentId = null;
  let subjectId;
  let facultyUserId = null;
  let facultyUserId2 = null;
  let facultyId;
  let ephemeralAdminEmail = null;
  const createdAssignmentIds = [];

  try {
    // --------------------------------------------------
    // Setup: Faculty user, admin, department, faculty profile, subject
    // --------------------------------------------------

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Assignment Faculty",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId = facultyUser.user_id;
    assert(facultyUserId, "Temporary FACULTY user should have user_id");

    await createTemporaryUser({
      email: facultyNoProfileEmail,
      name: "E2E Assignment Faculty No Profile",
      role: "FACULTY",
      password: facultyPassword,
    });

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

    const facultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Assignment Faculty Member",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Faculty Profile:", facultyResponse.status);
    assert(facultyResponse.status === 201, "Faculty creation should return 201");

    facultyId = facultyResponse.data.faculty.facultyId;
    assert(facultyId, "Faculty response should contain facultyId");

    const subjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "E2E Assignment Subject",
        dept_id: departmentId,
        semester: 5,
        credits: 4,
      },
      adminToken
    );

    console.log("Create Subject:", subjectResponse.status);
    assert(subjectResponse.status === 201, "Subject creation should return 201");

    subjectId = subjectResponse.data.subject.subjectId;
    assert(subjectId, "Subject response should contain subjectId");

    const facultyLoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });

    assert(facultyLoginResponse.status === 200, "Faculty login should return 200");

    const facultyToken = facultyLoginResponse.data.result.token;
    assert(facultyToken, "Faculty login should return JWT token");
    console.log("Login Faculty: 200");

    const validAssignmentBody = {
      subject_id: subjectId,
      title,
      description: "Complete the E2E assignment module questions.",
      section: "A",
      deadline,
      max_marks: 100,
      allow_late: false,
      attachment_url: "https://example.com/assignments/e2e-brief.pdf",
    };

    // --------------------------------------------------
    // 1. Faculty can create an assignment
    // --------------------------------------------------

    const createResponse = await request("POST", "/assignments", validAssignmentBody, facultyToken);

    console.log("Create Assignment:", createResponse.status);
    assert(createResponse.status === 201, "Faculty assignment creation should return 201");

    const assignment = createResponse.data.assignment;
    assert(assignment, "Response should contain assignment");
    assert(assignment.assignment_id, "Assignment response should contain assignment_id");

    createdAssignmentIds.push(assignment.assignment_id);

    assert(
      assignment.subject_id === subjectId,
      "Assignment response should contain requested subject_id"
    );
    assert(
      assignment.faculty_id === facultyId,
      "Assignment faculty_id should belong to authenticated Faculty"
    );
    assert(assignment.title === title, "Assignment response should contain title");
    assert(
      assignment.description === validAssignmentBody.description,
      "Assignment response should contain description"
    );
    assert(assignment.section === "A", "Assignment response should contain section");
    assert(assignment.deadline, "Assignment response should contain deadline");
    assert(
      new Date(assignment.deadline).toISOString() === new Date(deadline).toISOString(),
      "Assignment response should contain correct deadline"
    );
    assert(assignment.max_marks === 100, "Assignment response should contain max_marks");
    assert(assignment.allow_late === false, "Assignment response should contain allow_late");
    assert(
      assignment.attachment_url === validAssignmentBody.attachment_url,
      "Assignment response should contain attachment_url"
    );
    assert(assignment.created_at, "Assignment response should contain created_at");

    console.log("Verify Assignment fields: passed");

    // --------------------------------------------------
    // 8. Verify database persistence
    // --------------------------------------------------

    const persisted = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(persisted, "Assignment row should exist in database");
    assert(
      persisted.subject_id === subjectId,
      "Persisted assignment should have correct subject_id"
    );
    assert(
      persisted.faculty_id === facultyId,
      "Persisted assignment should have correct faculty_id"
    );
    assert(persisted.title === title, "Persisted assignment should have correct title");
    assert(persisted.section === "A", "Persisted assignment should have correct section");
    assert(
      persisted.deadline.toISOString() === new Date(deadline).toISOString(),
      "Persisted assignment should have correct deadline"
    );
    assert(persisted.max_marks === 100, "Persisted assignment should have correct max_marks");

    console.log("Verify DB persistence: passed");

    // --------------------------------------------------
    // 7. Duplicate assignment
    // --------------------------------------------------

    const duplicateResponse = await request(
      "POST",
      "/assignments",
      validAssignmentBody,
      facultyToken
    );

    console.log("Duplicate Assignment:", duplicateResponse.status);
    assert(duplicateResponse.status === 409, "Duplicate assignment should return 409");
    assert(
      duplicateResponse.data?.message === "Assignment already exists",
      'Duplicate assignment should return message "Assignment already exists"'
    );

    // --------------------------------------------------
    // 2. Student cannot create an assignment
    // --------------------------------------------------

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Assignment Student",
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
      "/assignments",
      {
        ...validAssignmentBody,
        title: `Student Forbidden Assignment ${testId}`,
      },
      studentToken
    );

    console.log("Student Assignment Create:", studentCreateResponse.status);
    assert(studentCreateResponse.status === 403, "Student assignment creation should return 403");
    assert(
      studentCreateResponse.data?.message === "Access denied",
      'Student assignment creation should return message "Access denied"'
    );

    // --------------------------------------------------
    // 3. Unauthenticated user cannot create an assignment
    // --------------------------------------------------

    const unauthResponse = await request("POST", "/assignments", {
      ...validAssignmentBody,
      title: `Unauth Assignment ${testId}`,
    });

    console.log("No Authorization:", unauthResponse.status);
    assert(unauthResponse.status === 401, "Unauthenticated assignment creation should return 401");
    assert(
      unauthResponse.data?.message === "Authentication required",
      'Unauthenticated assignment creation should return message "Authentication required"'
    );

    // --------------------------------------------------
    // 4. Invalid request body (validation failures)
    // --------------------------------------------------

    const validationCases = [
      {
        label: "missing title",
        body: {
          subject_id: subjectId,
          description: "Valid description",
          section: "A",
          deadline,
          max_marks: 50,
        },
      },
      {
        label: "empty description",
        body: {
          subject_id: subjectId,
          title: `Empty Desc ${testId}`,
          description: "",
          section: "A",
          deadline,
          max_marks: 50,
        },
      },
      {
        label: "invalid subject_id",
        body: {
          subject_id: -1,
          title: `Invalid Subject ${testId}`,
          description: "Valid description",
          section: "A",
          deadline,
          max_marks: 50,
        },
      },
      {
        label: "empty section",
        body: {
          subject_id: subjectId,
          title: `Empty Section ${testId}`,
          description: "Valid description",
          section: "",
          deadline,
          max_marks: 50,
        },
      },
      {
        label: "past deadline",
        body: {
          subject_id: subjectId,
          title: `Past Deadline ${testId}`,
          description: "Valid description",
          section: "A",
          deadline: pastDeadline(),
          max_marks: 50,
        },
      },
      {
        label: "invalid max_marks",
        body: {
          subject_id: subjectId,
          title: `Invalid Marks ${testId}`,
          description: "Valid description",
          section: "A",
          deadline,
          max_marks: 0,
        },
      },
      {
        label: "invalid attachment_url",
        body: {
          subject_id: subjectId,
          title: `Invalid URL ${testId}`,
          description: "Valid description",
          section: "A",
          deadline,
          max_marks: 50,
          attachment_url: "not-a-valid-url",
        },
      },
    ];

    for (const testCase of validationCases) {
      const validationResponse = await request("POST", "/assignments", testCase.body, facultyToken);

      console.log(`Validation (${testCase.label}):`, validationResponse.status);

      assert(
        validationResponse.status === 400,
        `Validation failure (${testCase.label}) should return 400`
      );
      assert(
        validationResponse.data?.message === "Validation failed",
        `Validation failure (${testCase.label}) should return message "Validation failed"`
      );
      assert(
        Array.isArray(validationResponse.data?.errors) && validationResponse.data.errors.length > 0,
        `Validation failure (${testCase.label}) should include errors array`
      );
    }

    // --------------------------------------------------
    // 5. Non-existent Subject
    // --------------------------------------------------

    const missingSubjectResponse = await request(
      "POST",
      "/assignments",
      {
        ...validAssignmentBody,
        subject_id: 999999999,
        title: `Missing Subject Assignment ${testId}`,
      },
      facultyToken
    );

    console.log("Nonexistent subject:", missingSubjectResponse.status);
    assert(missingSubjectResponse.status === 404, "Nonexistent subject should return 404");
    assert(
      missingSubjectResponse.data?.message === "Subject not found",
      'Nonexistent subject should return message "Subject not found"'
    );

    // --------------------------------------------------
    // 6. Faculty without a Faculty profile
    // --------------------------------------------------

    const noProfileLoginResponse = await request("POST", "/auth/login", {
      email: facultyNoProfileEmail,
      password: facultyPassword,
    });

    assert(
      noProfileLoginResponse.status === 200,
      "Faculty-without-profile login should return 200"
    );

    const noProfileToken = noProfileLoginResponse.data.result.token;

    const noProfileResponse = await request(
      "POST",
      "/assignments",
      {
        ...validAssignmentBody,
        title: `No Profile Assignment ${testId}`,
      },
      noProfileToken
    );

    console.log("Faculty without profile:", noProfileResponse.status);
    assert(noProfileResponse.status === 404, "Faculty without profile should return 404");
    assert(
      noProfileResponse.data?.message === "Faculty profile not found",
      'Faculty without profile should return message "Faculty profile not found"'
    );

    // --------------------------------------------------
    // GET /assignments/:id
    // --------------------------------------------------

    const getResponse = await request(
      "GET",
      `/assignments/${assignment.assignment_id}`,
      null,
      facultyToken
    );

    console.log("Get Assignment:", getResponse.status);
    assert(getResponse.status === 200, "Get assignment should return 200");

    const fetchedAssignment = getResponse.data.assignment;
    assert(fetchedAssignment, "Get response should contain assignment");
    assert(
      fetchedAssignment.assignment_id === assignment.assignment_id,
      "Fetched assignment_id should match created assignment"
    );
    assert(
      fetchedAssignment.subject_id === subjectId,
      "Fetched assignment should contain correct subject_id"
    );
    assert(
      fetchedAssignment.faculty_id === facultyId,
      "Fetched assignment should contain correct faculty_id"
    );
    assert(fetchedAssignment.title === title, "Fetched assignment should contain correct title");
    assert(
      fetchedAssignment.description === validAssignmentBody.description,
      "Fetched assignment should contain correct description"
    );
    assert(fetchedAssignment.section === "A", "Fetched assignment should contain correct section");
    assert(fetchedAssignment.deadline, "Fetched assignment should contain deadline");
    assert(
      new Date(fetchedAssignment.deadline).toISOString() === new Date(deadline).toISOString(),
      "Fetched assignment should contain correct deadline"
    );
    assert(
      fetchedAssignment.max_marks === 100,
      "Fetched assignment should contain correct max_marks"
    );
    assert(
      fetchedAssignment.allow_late === false,
      "Fetched assignment should contain correct allow_late"
    );
    assert(
      fetchedAssignment.attachment_url === validAssignmentBody.attachment_url,
      "Fetched assignment should contain correct attachment_url"
    );
    assert(fetchedAssignment.created_at, "Fetched assignment should contain created_at");

    console.log("Verify Assignment fields: passed");

    const fetchedFromDb = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(fetchedFromDb, "Fetched assignment should still exist in database");
    assert(
      fetchedAssignment.assignment_id === fetchedFromDb.assignment_id,
      "API assignment_id should match database record"
    );
    assert(
      fetchedAssignment.subject_id === fetchedFromDb.subject_id,
      "API subject_id should match database record"
    );
    assert(
      fetchedAssignment.faculty_id === fetchedFromDb.faculty_id,
      "API faculty_id should match database record"
    );
    assert(
      fetchedAssignment.title === fetchedFromDb.title,
      "API title should match database record"
    );
    assert(
      fetchedAssignment.description === fetchedFromDb.description,
      "API description should match database record"
    );
    assert(
      fetchedAssignment.section === fetchedFromDb.section,
      "API section should match database record"
    );
    assert(
      new Date(fetchedAssignment.deadline).toISOString() === fetchedFromDb.deadline.toISOString(),
      "API deadline should match database record"
    );
    assert(
      fetchedAssignment.max_marks === fetchedFromDb.max_marks,
      "API max_marks should match database record"
    );
    assert(
      fetchedAssignment.allow_late === fetchedFromDb.allow_late,
      "API allow_late should match database record"
    );
    assert(
      fetchedAssignment.attachment_url === fetchedFromDb.attachment_url,
      "API attachment_url should match database record"
    );

    console.log("Verify GET DB consistency: passed");

    const missingAssignmentResponse = await request(
      "GET",
      "/assignments/999999999",
      null,
      facultyToken
    );

    console.log("Nonexistent Assignment:", missingAssignmentResponse.status);
    assert(missingAssignmentResponse.status === 404, "Nonexistent assignment should return 404");
    assert(
      missingAssignmentResponse.data?.message === "Assignment not found",
      'Nonexistent assignment should return message "Assignment not found"'
    );

    const getUnauthResponse = await request("GET", `/assignments/${assignment.assignment_id}`);

    console.log("Get Assignment No Authorization:", getUnauthResponse.status);
    assert(getUnauthResponse.status === 401, "Unauthenticated get assignment should return 401");
    assert(
      getUnauthResponse.data?.message === "Authentication required",
      'Unauthenticated get assignment should return message "Authentication required"'
    );

    // --------------------------------------------------
    // PATCH /assignments/:id
    // --------------------------------------------------

    const updatePayload = {
      title: "Updated DBMS Assignment",
      description: "Updated assignment description",
      max_marks: 30,
      allow_late: true,
    };

    const updateResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      updatePayload,
      facultyToken
    );

    console.log("Update Assignment:", updateResponse.status);
    assert(updateResponse.status === 200, "Assignment update should return 200");
    assert(
      updateResponse.data?.message === "Assignment updated successfully",
      'Assignment update should return message "Assignment updated successfully"'
    );

    const updatedAssignment = updateResponse.data.updatedAssignment;
    assert(updatedAssignment, "Update response should contain updatedAssignment");
    assert(
      updatedAssignment.assignment_id === assignment.assignment_id,
      "Updated assignment_id should remain unchanged"
    );
    assert(
      updatedAssignment.subject_id === subjectId,
      "Updated subject_id should remain unchanged"
    );
    assert(
      updatedAssignment.faculty_id === facultyId,
      "Updated faculty_id should remain unchanged"
    );
    assert(updatedAssignment.section === "A", "Updated section should remain unchanged");
    assert(updatedAssignment.title === updatePayload.title, "Updated title should match request");
    assert(
      updatedAssignment.description === updatePayload.description,
      "Updated description should match request"
    );
    assert(updatedAssignment.max_marks === 30, "Updated max_marks should match request");
    assert(updatedAssignment.allow_late === true, "Updated allow_late should match request");
    assert(
      new Date(updatedAssignment.deadline).toISOString() === new Date(deadline).toISOString(),
      "Deadline should remain unchanged when not provided"
    );
    assert(
      updatedAssignment.attachment_url === validAssignmentBody.attachment_url,
      "attachment_url should remain unchanged when not provided"
    );

    console.log("Verify Assignment update fields: passed");

    const partialUpdateResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { max_marks: 35 },
      facultyToken
    );

    console.log("Partial Update Assignment:", partialUpdateResponse.status);
    assert(partialUpdateResponse.status === 200, "Partial assignment update should return 200");

    const partiallyUpdated = partialUpdateResponse.data.updatedAssignment;
    assert(partiallyUpdated, "Partial update response should contain updatedAssignment");
    assert(partiallyUpdated.max_marks === 35, "Partial update should change max_marks");
    assert(
      partiallyUpdated.title === updatePayload.title,
      "Partial update should leave title unchanged"
    );
    assert(
      partiallyUpdated.description === updatePayload.description,
      "Partial update should leave description unchanged"
    );
    assert(
      partiallyUpdated.allow_late === true,
      "Partial update should leave allow_late unchanged"
    );
    assert(partiallyUpdated.section === "A", "Partial update should leave section unchanged");
    assert(
      partiallyUpdated.subject_id === subjectId,
      "Partial update should leave subject_id unchanged"
    );
    assert(
      partiallyUpdated.faculty_id === facultyId,
      "Partial update should leave faculty_id unchanged"
    );

    console.log("Verify Partial Update: passed");

    const updatedFromDb = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(updatedFromDb, "Updated assignment should exist in database");
    assert(updatedFromDb.title === updatePayload.title, "Persisted title should match update");
    assert(
      updatedFromDb.description === updatePayload.description,
      "Persisted description should match update"
    );
    assert(updatedFromDb.max_marks === 35, "Persisted max_marks should match partial update");
    assert(updatedFromDb.allow_late === true, "Persisted allow_late should match update");
    assert(updatedFromDb.subject_id === subjectId, "Persisted subject_id should remain unchanged");
    assert(updatedFromDb.faculty_id === facultyId, "Persisted faculty_id should remain unchanged");
    assert(updatedFromDb.section === "A", "Persisted section should remain unchanged");
    assert(
      updatedFromDb.assignment_id === assignment.assignment_id,
      "Persisted assignment_id should remain unchanged"
    );

    console.log("Verify PATCH DB persistence: passed");

    const studentUpdateResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { title: "Student Forbidden Update" },
      studentToken
    );

    console.log("Student Assignment Update:", studentUpdateResponse.status);
    assert(studentUpdateResponse.status === 403, "Student assignment update should return 403");

    const afterStudentAttempt = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(
      afterStudentAttempt.title === updatePayload.title,
      "Assignment title should remain unchanged after student update attempt"
    );
    assert(
      afterStudentAttempt.max_marks === 35,
      "Assignment max_marks should remain unchanged after student update attempt"
    );

    const patchUnauthResponse = await request("PATCH", `/assignments/${assignment.assignment_id}`, {
      title: "Unauth Update",
    });

    console.log("Update Assignment No Authorization:", patchUnauthResponse.status);
    assert(
      patchUnauthResponse.status === 401,
      "Unauthenticated assignment update should return 401"
    );
    assert(
      patchUnauthResponse.data?.message === "Authentication required",
      'Unauthenticated assignment update should return message "Authentication required"'
    );

    const patchMissingResponse = await request(
      "PATCH",
      "/assignments/999999999",
      { title: "Missing Assignment Update" },
      facultyToken
    );

    console.log("Update Nonexistent Assignment:", patchMissingResponse.status);
    assert(
      patchMissingResponse.status === 404,
      "Updating nonexistent assignment should return 404"
    );
    assert(
      patchMissingResponse.data?.message === "Assignment not found",
      'Updating nonexistent assignment should return message "Assignment not found"'
    );

    const facultyUser2 = await createTemporaryUser({
      email: facultyEmail2,
      name: "E2E Assignment Faculty 2",
      role: "FACULTY",
      password: facultyPassword,
    });

    facultyUserId2 = facultyUser2.user_id;
    assert(facultyUserId2, "Second FACULTY user should have user_id");

    const faculty2Response = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId2,
        employee_id: employeeId2,
        full_name: "E2E Assignment Faculty Member 2",
        dept_id: departmentId,
        designation: "Associate Professor",
        phone: "9876543211",
      },
      adminToken
    );

    console.log("Create Second Faculty Profile:", faculty2Response.status);
    assert(faculty2Response.status === 201, "Second faculty creation should return 201");

    const faculty2LoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail2,
      password: facultyPassword,
    });

    assert(faculty2LoginResponse.status === 200, "Second faculty login should return 200");

    const faculty2Token = faculty2LoginResponse.data.result.token;

    const otherFacultyUpdateResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { title: "Other Faculty Update" },
      faculty2Token
    );

    console.log("Other Faculty Assignment Update:", otherFacultyUpdateResponse.status);
    assert(
      otherFacultyUpdateResponse.status === 404,
      "Other faculty assignment update should return 404"
    );
    assert(
      otherFacultyUpdateResponse.data?.message === "Assignment not found",
      'Other faculty assignment update should return message "Assignment not found"'
    );

    const afterOtherFacultyAttempt = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(
      afterOtherFacultyAttempt.title === updatePayload.title,
      "Assignment title should remain unchanged after other-faculty update attempt"
    );

    const emptyBodyResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      {},
      facultyToken
    );

    console.log("Update Validation (empty body):", emptyBodyResponse.status);
    assert(emptyBodyResponse.status === 400, "Empty update body should return 400");
    assert(
      emptyBodyResponse.data?.message === "Validation failed",
      'Empty update body should return message "Validation failed"'
    );

    const emptyTitleResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { title: "" },
      facultyToken
    );

    console.log("Update Validation (invalid title):", emptyTitleResponse.status);
    assert(emptyTitleResponse.status === 400, "Empty title update should return 400");

    const emptyDescriptionResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { description: "" },
      facultyToken
    );

    console.log("Update Validation (invalid description):", emptyDescriptionResponse.status);
    assert(emptyDescriptionResponse.status === 400, "Empty description update should return 400");

    const pastDeadlineResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { deadline: pastDeadline() },
      facultyToken
    );

    console.log("Update Validation (past deadline):", pastDeadlineResponse.status);
    assert(pastDeadlineResponse.status === 400, "Past deadline update should return 400");

    const invalidMarksResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { max_marks: 0 },
      facultyToken
    );

    console.log("Update Validation (invalid max_marks):", invalidMarksResponse.status);
    assert(invalidMarksResponse.status === 400, "Invalid max_marks update should return 400");

    const invalidUrlResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      { attachment_url: "not-a-valid-url" },
      facultyToken
    );

    console.log("Update Validation (invalid attachment_url):", invalidUrlResponse.status);
    assert(invalidUrlResponse.status === 400, "Invalid attachment_url update should return 400");

    // Protected fields are not in updateAssignmentSchema. Zod strips unknown keys,
    // so a body with only protected fields becomes {} and fails the "at least one field" refine.
    const protectedOnlyResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      {
        assignment_id: 123456,
        subject_id: 123456,
        faculty_id: 123456,
        section: "Z",
      },
      facultyToken
    );

    console.log("Update Validation (protected fields only):", protectedOnlyResponse.status);
    assert(
      protectedOnlyResponse.status === 400,
      "Protected-fields-only update should return 400 after Zod strip"
    );

    // When mixed with a valid field, unknown protected keys are stripped and only the valid field applies.
    const protectedMixedResponse = await request(
      "PATCH",
      `/assignments/${assignment.assignment_id}`,
      {
        title: "Protected Fields Mixed Update",
        assignment_id: 123456,
        subject_id: 123456,
        faculty_id: 123456,
        section: "Z",
      },
      facultyToken
    );

    console.log("Update With Protected Fields Mixed:", protectedMixedResponse.status);
    assert(
      protectedMixedResponse.status === 200,
      "Mixed update with protected fields should return 200 (unknown keys stripped)"
    );

    const protectedMixedAssignment = protectedMixedResponse.data.updatedAssignment;
    assert(
      protectedMixedAssignment.title === "Protected Fields Mixed Update",
      "Valid title should update when mixed with protected fields"
    );
    assert(
      protectedMixedAssignment.assignment_id === assignment.assignment_id,
      "assignment_id must not change through PATCH"
    );
    assert(
      protectedMixedAssignment.subject_id === subjectId,
      "subject_id must not change through PATCH"
    );
    assert(
      protectedMixedAssignment.faculty_id === facultyId,
      "faculty_id must not change through PATCH"
    );
    assert(protectedMixedAssignment.section === "A", "section must not change through PATCH");

    const afterProtectedAttempt = await prisma.assignment.findUnique({
      where: { assignment_id: assignment.assignment_id },
    });

    assert(
      afterProtectedAttempt.subject_id === subjectId,
      "Persisted subject_id must not change through PATCH"
    );
    assert(
      afterProtectedAttempt.faculty_id === facultyId,
      "Persisted faculty_id must not change through PATCH"
    );
    assert(
      afterProtectedAttempt.section === "A",
      "Persisted section must not change through PATCH"
    );
    assert(
      afterProtectedAttempt.title === "Protected Fields Mixed Update",
      "Persisted title should reflect the allowed update field"
    );

    console.log("Verify Protected Fields Immutable: passed");

    console.log("\n✓ All Assignment API tests passed\n");
  } finally {
    await cleanupTestData({
      assignmentIds: createdAssignmentIds,
      subjectCodes: [subjectCode],
      facultyUserIds: [facultyUserId, facultyUserId2],
      departmentId,
      userEmails: [
        facultyEmail,
        facultyEmail2,
        facultyNoProfileEmail,
        studentEmail,
        ephemeralAdminEmail,
      ],
    });

    await prisma.$disconnect();
  }
}

runTests().catch(async (error) => {
  console.error("\n✗ Assignment API test failed");
  console.error(error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
