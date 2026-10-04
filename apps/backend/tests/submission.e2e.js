import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";

const BASE_URL = "http://localhost:3000/api/v1";
const STORAGE_ROOT = path.resolve("apps/backend/storage");
const SUBMISSIONS_DIR = path.join(STORAGE_ROOT, "submissions");
const TEMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), ".tmp-submission-e2e");

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UUID_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i;

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
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return {
    status: response.status,
    data,
  };
}

async function uploadRequest(endpoint, filePath, token = null, filename = null) {
  const buffer = await fs.readFile(filePath);
  const form = new FormData();
  const uploadName = filename || path.basename(filePath);
  form.append("file", new Blob([buffer]), uploadName);

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(60000),
  });

  let data = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
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
  return `U${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId) {
  return `UD${String(testId).slice(-8)}`.slice(0, 10);
}

function subjectCodeFor(testId, suffix = "") {
  return `US${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function rollNumberFor(testId, suffix = "") {
  return `UR${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function findStudentResult(students, studentId) {
  return (students || []).find((student) => student.student_id === studentId);
}

function assertNoFileUrlLeak(value, label) {
  const serialized = JSON.stringify(value);
  assert(serialized.includes("file_url") === false, `${label} must not expose file_url`);
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

  const email = `e2e.submission.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Submission Admin",
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

async function writeTempFile(name, contents) {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, name);

  if (typeof contents === "number") {
    const handle = await fs.open(filePath, "w");
    try {
      await handle.truncate(contents);
    } finally {
      await handle.close();
    }
  } else if (Buffer.isBuffer(contents)) {
    await fs.writeFile(filePath, contents);
  } else {
    await fs.writeFile(filePath, contents, "utf8");
  }

  return filePath;
}

function absoluteFromRelative(relativePath) {
  return path.resolve(STORAGE_ROOT, relativePath);
}

async function listFilesRecursive(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await listFilesRecursive(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function removeAssignmentStorage(assignmentIds) {
  for (const assignmentId of assignmentIds.filter(Boolean)) {
    const dir = path.join(SUBMISSIONS_DIR, `assignment-${assignmentId}`);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function cleanupTestData({
  assignmentIds,
  subjectCodes,
  facultyUserIds,
  studentUserId,
  studentUserIds,
  departmentId,
  userEmails,
}) {
  const ids = (assignmentIds || []).filter(Boolean);

  if (ids.length > 0) {
    await prisma.submission.deleteMany({
      where: {
        assignment_id: { in: ids },
      },
    });

    await prisma.assignment.deleteMany({
      where: {
        assignment_id: { in: ids },
      },
    });

    await removeAssignmentStorage(ids);
  }

  const codes = (subjectCodes || []).filter(Boolean);

  if (codes.length > 0) {
    await prisma.subject.deleteMany({
      where: {
        subject_code: { in: codes },
      },
    });
  }

  const allStudentUserIds = [...(studentUserIds || []), studentUserId].filter(Boolean);

  if (allStudentUserIds.length > 0) {
    await prisma.student.deleteMany({
      where: { user_id: { in: allStudentUserIds } },
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

  await fs.rm(TEMP_DIR, { recursive: true, force: true });
}

async function createAssignmentViaApi({
  facultyToken,
  subjectId,
  title,
  allowLate = false,
  section = "A",
}) {
  const response = await request(
    "POST",
    "/assignments",
    {
      subject_id: subjectId,
      title,
      description: `Submission E2E assignment ${title}`,
      section,
      deadline: futureDeadline(10),
      max_marks: 100,
      allow_late: allowLate,
    },
    facultyToken
  );

  assert(
    response.status === 201,
    `Assignment creation should return 201 (got ${response.status} for ${title})`
  );

  return response.data.assignment;
}

async function runTests() {
  console.log("\nRunning Submission API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.submission.faculty.${testId}@campusos.test`;
  const facultyBEmail = `e2e.submission.faculty.b.${testId}@campusos.test`;
  const studentEmail = `e2e.submission.student.${testId}@campusos.test`;
  const reviewPendingEmail = `e2e.submission.review.pending.${testId}@campusos.test`;
  const reviewSubmittedEmail = `e2e.submission.review.submitted.${testId}@campusos.test`;
  const reviewLateEmail = `e2e.submission.review.late.${testId}@campusos.test`;
  const reviewGradedEmail = `e2e.submission.review.graded.${testId}@campusos.test`;
  const departmentName = `E2E Submission Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const subjectCode = subjectCodeFor(testId);
  const employeeId = employeeIdFor(testId);
  const employeeIdB = employeeIdFor(testId, "B");
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";

  let departmentId;
  let subjectId;
  let facultyUserId;
  let facultyBUserId;
  let studentUserId;
  let studentId;
  let ephemeralAdminEmail;
  const createdAssignmentIds = [];
  const reviewStudentUserIds = [];
  const reviewUserEmails = [
    facultyBEmail,
    reviewPendingEmail,
    reviewSubmittedEmail,
    reviewLateEmail,
    reviewGradedEmail,
  ];

  const pdfPath = await writeTempFile(
    "sample-report.pdf",
    "%PDF-1.4\n% CampusOS submission E2E PDF fixture\n"
  );
  const docxPath = await writeTempFile(
    "notes.docx",
    Buffer.from("PK\u0003\u0004CampusOS DOCX-like fixture for submission E2E")
  );
  const spacedNamePath = await writeTempFile("temp-spaced.bin", "spaced filename fixture");
  const weirdNamePath = await writeTempFile("temp-weird.bin", "weird filename fixture");
  const nearLimitPath = await writeTempFile("near-25mb.bin", MAX_FILE_SIZE);
  const overLimitPath = await writeTempFile("over-25mb.bin", MAX_FILE_SIZE + 1);

  try {
    // --------------------------------------------------
    // Setup
    // --------------------------------------------------

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Submission Faculty",
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

    const facultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyUserId,
        employee_id: employeeId,
        full_name: "E2E Submission Faculty Member",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Faculty Profile:", facultyResponse.status);
    assert(facultyResponse.status === 201, "Faculty creation should return 201");

    const subjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "E2E Submission Subject",
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

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Submission Student",
      email: studentEmail,
      password: studentPassword,
    });

    assert(registerResponse.status === 201, "Student registration should return 201");
    studentUserId = registerResponse.data.user.user_id;
    assert(studentUserId, "Student registration should return user_id");

    const studentProfileResponse = await request(
      "POST",
      "/students",
      {
        userId: studentUserId,
        roll_number: rollNumberFor(testId),
        full_name: "E2E Submission Student",
        dept_id: departmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543210",
      },
      adminToken
    );

    console.log("Create Student:", studentProfileResponse.status);
    assert(studentProfileResponse.status === 201, "Student profile creation should return 201");

    studentId = studentProfileResponse.data.student.studentId;
    assert(studentId, "Student profile response should contain studentId");
    assert(
      studentProfileResponse.data.student.userId === studentUserId,
      "Student profile should link to registered user"
    );

    const studentLoginResponse = await request("POST", "/auth/login", {
      email: studentEmail,
      password: studentPassword,
    });

    console.log("Login Student:", studentLoginResponse.status);
    assert(studentLoginResponse.status === 200, "Student login should return 200");

    const studentToken = studentLoginResponse.data.result.token;
    assert(studentToken, "Student login should return JWT token");

    const facultyLoginResponse = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });

    assert(facultyLoginResponse.status === 200, "Faculty login should return 200");
    const facultyToken = facultyLoginResponse.data.result.token;
    assert(facultyToken, "Faculty login should return JWT token");

    const onTimeAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission OnTime ${testId}`,
      allowLate: false,
      section: "A",
    });
    createdAssignmentIds.push(onTimeAssignment.assignment_id);
    console.log("Create Assignment:", 201);

    const rejectLateAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission RejectLate ${testId}`,
      allowLate: false,
      section: "B",
    });
    createdAssignmentIds.push(rejectLateAssignment.assignment_id);

    await prisma.assignment.update({
      where: { assignment_id: rejectLateAssignment.assignment_id },
      data: { deadline: new Date(pastDeadline()) },
    });

    const allowLateAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission AllowLate ${testId}`,
      allowLate: true,
      section: "C",
    });
    createdAssignmentIds.push(allowLateAssignment.assignment_id);

    await prisma.assignment.update({
      where: { assignment_id: allowLateAssignment.assignment_id },
      data: { deadline: new Date(pastDeadline()) },
    });

    const oversizedAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission Oversized ${testId}`,
      allowLate: false,
      section: "E",
    });
    createdAssignmentIds.push(oversizedAssignment.assignment_id);

    // --------------------------------------------------
    // Authorization
    // --------------------------------------------------

    const noAuthResponse = await uploadRequest(
      `/submissions/assignments/${onTimeAssignment.assignment_id}`,
      pdfPath
    );

    console.log("No Authorization:", noAuthResponse.status);
    assert(noAuthResponse.status === 401, "Missing Authorization should return 401");

    const adminSubmitResponse = await uploadRequest(
      `/submissions/assignments/${onTimeAssignment.assignment_id}`,
      pdfPath,
      adminToken
    );

    console.log("Admin Submission:", adminSubmitResponse.status);
    assert(adminSubmitResponse.status === 403, "Admin submission should return 403");

    const facultySubmitResponse = await uploadRequest(
      `/submissions/assignments/${onTimeAssignment.assignment_id}`,
      pdfPath,
      facultyToken
    );

    console.log("Faculty Submission:", facultySubmitResponse.status);
    assert(facultySubmitResponse.status === 403, "Faculty submission should return 403");

    // --------------------------------------------------
    // Validation / request
    // --------------------------------------------------

    const missingFileResponse = await fetch(
      `${BASE_URL}/submissions/assignments/${onTimeAssignment.assignment_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${studentToken}`,
        },
        body: new FormData(),
        signal: AbortSignal.timeout(30000),
      }
    );

    let missingFileData = null;
    const missingFileText = await missingFileResponse.text();

    if (missingFileText) {
      try {
        missingFileData = JSON.parse(missingFileText);
      } catch {
        missingFileData = { raw: missingFileText };
      }
    }

    console.log("Missing File:", missingFileResponse.status);
    assert(missingFileResponse.status === 400, "Missing file should return 400");
    assert(
      typeof missingFileData?.message === "string",
      "Missing file response should include a message"
    );

    const invalidIdResponse = await uploadRequest(
      "/submissions/assignments/0",
      pdfPath,
      studentToken
    );

    console.log("Invalid Assignment ID:", invalidIdResponse.status);
    assert(invalidIdResponse.status === 400, "Invalid assignment ID should return 400");

    const nonNumericIdResponse = await uploadRequest(
      "/submissions/assignments/not-a-number",
      pdfPath,
      studentToken
    );

    console.log("Non-numeric Assignment ID:", nonNumericIdResponse.status);
    assert(nonNumericIdResponse.status === 400, "Non-numeric assignment ID should return 400");

    const nonexistentIdResponse = await uploadRequest(
      "/submissions/assignments/99999999",
      pdfPath,
      studentToken
    );

    console.log("Nonexistent Assignment:", nonexistentIdResponse.status);
    assert(nonexistentIdResponse.status === 404, "Nonexistent assignment should return 404");

    // --------------------------------------------------
    // Successful PDF submission + storage/DB checks
    // --------------------------------------------------

    const beforeFiles = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${onTimeAssignment.assignment_id}`)
    );

    const pdfSubmitResponse = await uploadRequest(
      `/submissions/assignments/${onTimeAssignment.assignment_id}`,
      pdfPath,
      studentToken,
      "report.pdf"
    );

    console.log("PDF Submission:", pdfSubmitResponse.status);
    assert(pdfSubmitResponse.status === 201, "PDF submission should return 201");
    assert(pdfSubmitResponse.data?.submission, "201 response should contain submission");

    const createdSubmission = pdfSubmitResponse.data.submission;
    assert(
      createdSubmission.assignment_id === onTimeAssignment.assignment_id,
      "Submission response should contain correct assignment_id"
    );
    assert(
      createdSubmission.student_id === studentId,
      "Submission response student_id should match authenticated Student profile"
    );
    assert(createdSubmission.file_url, "Submission response should contain file_url");
    assert(createdSubmission.submitted_at, "Submission response should contain submitted_at");
    assert(createdSubmission.is_late === false, "On-time submission should have is_late=false");
    assert(createdSubmission.marks == null, "New submission marks should be null");
    assert(createdSubmission.feedback == null, "New submission feedback should be null");
    assert(createdSubmission.graded_at == null, "New submission graded_at should be null");

    const relativePath = createdSubmission.file_url;
    assert(
      relativePath.startsWith(
        `submissions/assignment-${onTimeAssignment.assignment_id}/student-${studentId}/`
      ),
      "file_url should be under the assignment/student submission directory"
    );
    assert(
      relativePath.includes("apps/backend/storage") === false,
      "file_url should be a storage-relative path"
    );

    const storedFilename = path.posix.basename(relativePath);
    assert(
      UUID_FILENAME_RE.test(storedFilename),
      `Stored filename should be a UUID-based name (got ${storedFilename})`
    );
    assert(
      storedFilename !== "report.pdf",
      "Stored filename must not be the original client filename"
    );
    assert(storedFilename.endsWith(".pdf"), "Stored PDF should preserve .pdf extension");

    const absoluteStoredPath = absoluteFromRelative(relativePath);
    const storedStat = await fs.stat(absoluteStoredPath);
    assert(storedStat.isFile(), "Stored submission file should exist on filesystem");
    assert(
      absoluteStoredPath.startsWith(SUBMISSIONS_DIR + path.sep),
      "Stored file must remain inside apps/backend/storage/submissions/"
    );

    console.log("Verify Stored File: passed");

    const persisted = await prisma.submission.findUnique({
      where: {
        assignment_id_student_id: {
          assignment_id: onTimeAssignment.assignment_id,
          student_id: studentId,
        },
      },
    });

    assert(persisted, "Submission row should exist in database");
    assert(
      persisted.assignment_id === onTimeAssignment.assignment_id,
      "Persisted assignment_id should match"
    );
    assert(persisted.student_id === studentId, "Persisted student_id should match");
    assert(persisted.file_url === relativePath, "Persisted file_url should match response");
    assert(persisted.submitted_at instanceof Date, "Persisted submitted_at should be set");
    assert(persisted.is_late === false, "Persisted is_late should be false for future deadline");
    assert(persisted.marks === null, "Persisted marks should be null");
    assert(persisted.feedback === null, "Persisted feedback should be null");
    assert(persisted.graded_at === null, "Persisted graded_at should be null");

    const submissionCount = await prisma.submission.count({
      where: {
        assignment_id: onTimeAssignment.assignment_id,
        student_id: studentId,
      },
    });
    assert(submissionCount === 1, "Exactly one Submission row should exist after success");

    console.log("Verify DB Persistence: passed");

    const uploadedPdf = await fs.readFile(pdfPath);
    const storedPdf = await fs.readFile(absoluteStoredPath);
    assert(
      Buffer.compare(uploadedPdf, storedPdf) === 0,
      "Stored file contents should match uploaded PDF bytes"
    );

    console.log("Verify File Contents: passed");

    const afterSuccessFiles = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${onTimeAssignment.assignment_id}`)
    );
    assert(
      afterSuccessFiles.length === beforeFiles.length + 1,
      "Successful upload should add exactly one stored file"
    );

    // --------------------------------------------------
    // Arbitrary file type (DOCX-like) + original name metadata
    // --------------------------------------------------

    const docxAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission DOCX ${testId}`,
      allowLate: false,
      section: "F",
    });
    createdAssignmentIds.push(docxAssignment.assignment_id);

    const docxSubmitResponse = await uploadRequest(
      `/submissions/assignments/${docxAssignment.assignment_id}`,
      docxPath,
      studentToken,
      "lecture-notes.docx"
    );

    console.log("DOCX Submission:", docxSubmitResponse.status);
    assert(docxSubmitResponse.status === 201, "DOCX/arbitrary file submission should return 201");

    const docxRelative = docxSubmitResponse.data.submission.file_url;
    const docxStoredName = path.posix.basename(docxRelative);
    assert(
      docxStoredName !== "lecture-notes.docx",
      "DOCX stored filename must not equal original filename"
    );
    assert(docxStoredName.endsWith(".docx"), "DOCX extension should be preserved");
    assert(UUID_FILENAME_RE.test(docxStoredName), "DOCX stored filename should be UUID-based");

    const docxAbsolute = absoluteFromRelative(docxRelative);
    assert(
      (await fs.stat(docxAbsolute)).isFile(),
      "DOCX submission file should exist on filesystem"
    );
    assert(
      Buffer.compare(await fs.readFile(docxPath), await fs.readFile(docxAbsolute)) === 0,
      "DOCX stored contents should match upload"
    );

    // --------------------------------------------------
    // Replace submission before deadline (PRD behavior)
    // --------------------------------------------------

    const firstSubmissionId = createdSubmission.submission_id;
    const firstFileUrl = createdSubmission.file_url;
    const firstSubmittedAt = new Date(createdSubmission.submitted_at);
    const firstAbsolutePath = absoluteStoredPath;

    assert(firstSubmissionId, "First submission should include submission_id");
    assert(
      (await fs.stat(firstAbsolutePath)).isFile(),
      "First submission physical file should exist before replacement"
    );

    // Seed grading fields so replacement can prove they are cleared.
    await prisma.submission.update({
      where: { submission_id: firstSubmissionId },
      data: {
        marks: 77,
        feedback: "temporary feedback before replace",
        graded_at: new Date(),
        submitted_at: new Date(Date.now() - 60_000),
      },
    });

    const seededBeforeReplace = await prisma.submission.findUnique({
      where: { submission_id: firstSubmissionId },
    });
    assert(seededBeforeReplace.marks === 77, "Seeded marks should exist before replacement");
    assert(
      seededBeforeReplace.feedback === "temporary feedback before replace",
      "Seeded feedback should exist before replacement"
    );
    assert(
      seededBeforeReplace.graded_at instanceof Date,
      "Seeded graded_at should exist before replacement"
    );

    const replaceResponse = await uploadRequest(
      `/submissions/assignments/${onTimeAssignment.assignment_id}`,
      docxPath,
      studentToken,
      "replacement-notes.docx"
    );

    console.log("Replace Submission Before Deadline:", replaceResponse.status);
    assert(
      replaceResponse.status === 201,
      `Replacement before deadline should return 201 (got ${replaceResponse.status})`
    );

    const replacedSubmission = replaceResponse.data.submission;
    assert(replacedSubmission, "Replacement response should contain submission");
    assert(
      replacedSubmission.submission_id === firstSubmissionId,
      "Replacement must update the same submission_id"
    );
    assert(
      replacedSubmission.file_url !== firstFileUrl,
      "Replacement file_url should point to the new stored file"
    );
    assert(
      replacedSubmission.is_late === false,
      "Replacement before deadline should keep is_late=false"
    );
    assert(replacedSubmission.marks == null, "Replacement should reset marks to null");
    assert(replacedSubmission.feedback == null, "Replacement should reset feedback to null");
    assert(replacedSubmission.graded_at == null, "Replacement should reset graded_at to null");

    const replacedSubmittedAt = new Date(replacedSubmission.submitted_at);
    assert(
      replacedSubmittedAt.getTime() > firstSubmittedAt.getTime() ||
        replacedSubmittedAt.getTime() > seededBeforeReplace.submitted_at.getTime(),
      "Replacement submitted_at should be updated"
    );

    const newAbsolutePath = absoluteFromRelative(replacedSubmission.file_url);
    assert((await fs.stat(newAbsolutePath)).isFile(), "Replacement physical file should exist");

    let oldFileExists = true;
    try {
      await fs.stat(firstAbsolutePath);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        oldFileExists = false;
      } else {
        throw error;
      }
    }
    assert(oldFileExists === false, "Old physical file should be removed after replacement");

    const replaceCount = await prisma.submission.count({
      where: {
        assignment_id: onTimeAssignment.assignment_id,
        student_id: studentId,
      },
    });
    assert(
      replaceCount === 1,
      "Replacement must keep exactly one Submission row for the assignment/student pair"
    );

    const replacePersisted = await prisma.submission.findUnique({
      where: {
        assignment_id_student_id: {
          assignment_id: onTimeAssignment.assignment_id,
          student_id: studentId,
        },
      },
    });

    assert(replacePersisted, "Replaced submission should still exist in database");
    assert(
      replacePersisted.submission_id === firstSubmissionId,
      "Persisted submission_id should remain unchanged"
    );
    assert(
      replacePersisted.file_url === replacedSubmission.file_url,
      "Persisted file_url should match the new stored path"
    );
    assert(replacePersisted.is_late === false, "Persisted is_late should remain false");
    assert(replacePersisted.marks === null, "Persisted marks should be null after replacement");
    assert(
      replacePersisted.feedback === null,
      "Persisted feedback should be null after replacement"
    );
    assert(
      replacePersisted.graded_at === null,
      "Persisted graded_at should be null after replacement"
    );
    assert(
      Buffer.compare(await fs.readFile(docxPath), await fs.readFile(newAbsolutePath)) === 0,
      "New stored file contents should match the second uploaded file"
    );

    console.log("Verify Replacement Persistence: passed");

    // --------------------------------------------------
    // Deadline scenarios
    // --------------------------------------------------

    console.log("Future Deadline (verified via PDF Submission is_late=false): passed");

    const filesBeforePastReject = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${rejectLateAssignment.assignment_id}`)
    );

    const pastRejectResponse = await uploadRequest(
      `/submissions/assignments/${rejectLateAssignment.assignment_id}`,
      pdfPath,
      studentToken,
      "late.pdf"
    );

    console.log("Past Deadline Rejected:", pastRejectResponse.status);
    assert(
      pastRejectResponse.status === 400,
      "Past deadline with allow_late=false should return 400"
    );

    const pastRejectCount = await prisma.submission.count({
      where: {
        assignment_id: rejectLateAssignment.assignment_id,
        student_id: studentId,
      },
    });
    assert(pastRejectCount === 0, "Rejected late submission must not create a DB row");

    const filesAfterPastReject = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${rejectLateAssignment.assignment_id}`)
    );
    assert(
      filesAfterPastReject.length === filesBeforePastReject.length,
      "Rejected late submission must not leave a stored file"
    );

    const lateAllowResponse = await uploadRequest(
      `/submissions/assignments/${allowLateAssignment.assignment_id}`,
      pdfPath,
      studentToken,
      "late-allowed.pdf"
    );

    console.log("Late Submission Allowed:", lateAllowResponse.status);
    assert(
      lateAllowResponse.status === 201,
      "Past deadline with allow_late=true should return 201"
    );
    assert(
      lateAllowResponse.data.submission.is_late === true,
      "Late allowed submission response should have is_late=true"
    );

    const latePersisted = await prisma.submission.findUnique({
      where: {
        assignment_id_student_id: {
          assignment_id: allowLateAssignment.assignment_id,
          student_id: studentId,
        },
      },
    });

    assert(latePersisted, "Late allowed submission should create a DB row");
    assert(latePersisted.is_late === true, "Persisted late submission should have is_late=true");
    assert(
      (await fs.stat(absoluteFromRelative(latePersisted.file_url))).isFile(),
      "Late allowed submission file should exist"
    );

    console.log("Verify Late Flag: passed");

    // --------------------------------------------------
    // Student profile resolution (no client student_id)
    // --------------------------------------------------

    assert(
      createdSubmission.student_id === studentId,
      "API must resolve Student profile from JWT userId, not a client student_id field"
    );
    console.log("Verify Student Profile Resolution: passed");

    // --------------------------------------------------
    // Storage safety: spaces / unusual characters
    // --------------------------------------------------

    const spacedAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission SpacedName ${testId}`,
      allowLate: false,
      section: "G",
    });
    createdAssignmentIds.push(spacedAssignment.assignment_id);

    const spacedResponse = await uploadRequest(
      `/submissions/assignments/${spacedAssignment.assignment_id}`,
      spacedNamePath,
      studentToken,
      "my homework final.pdf"
    );

    console.log("Spaced Filename Submission:", spacedResponse.status);
    assert(spacedResponse.status === 201, "Filename with spaces should return 201");

    const spacedStored = path.posix.basename(spacedResponse.data.submission.file_url);
    assert(
      spacedStored !== "my homework final.pdf",
      "Spaced original filename must not be used as stored filename"
    );
    assert(UUID_FILENAME_RE.test(spacedStored), "Spaced-name upload should store UUID filename");
    assert(
      absoluteFromRelative(spacedResponse.data.submission.file_url).startsWith(
        path.join(SUBMISSIONS_DIR, `assignment-${spacedAssignment.assignment_id}`) + path.sep
      ),
      "Spaced-name upload must stay inside assignment submission directory"
    );

    const weirdAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission WeirdName ${testId}`,
      allowLate: false,
      section: "H",
    });
    createdAssignmentIds.push(weirdAssignment.assignment_id);

    const weirdResponse = await uploadRequest(
      `/submissions/assignments/${weirdAssignment.assignment_id}`,
      weirdNamePath,
      studentToken,
      "report#final@2026!.pdf"
    );

    console.log("Unusual Filename Submission:", weirdResponse.status);
    assert(weirdResponse.status === 201, "Unusual filename characters should return 201");

    const weirdStored = path.posix.basename(weirdResponse.data.submission.file_url);
    assert(
      weirdStored !== "report#final@2026!.pdf",
      "Unusual original filename must not be used as stored filename"
    );
    assert(UUID_FILENAME_RE.test(weirdStored), "Unusual-name upload should store UUID filename");
    assert(
      absoluteFromRelative(weirdResponse.data.submission.file_url).startsWith(
        path.join(SUBMISSIONS_DIR, `assignment-${weirdAssignment.assignment_id}`) + path.sep
      ),
      "Unusual-name upload must stay inside assignment submission directory"
    );

    console.log("Verify UUID Filename Safety: passed");

    // --------------------------------------------------
    // Near / over 25 MB
    // --------------------------------------------------

    const nearLimitAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission NearLimit ${testId}`,
      allowLate: false,
      section: "I",
    });
    createdAssignmentIds.push(nearLimitAssignment.assignment_id);

    const nearLimitResponse = await uploadRequest(
      `/submissions/assignments/${nearLimitAssignment.assignment_id}`,
      nearLimitPath,
      studentToken,
      "near-25mb.bin"
    );

    console.log("Near Limit File:", nearLimitResponse.status);
    assert(
      nearLimitResponse.status === 201,
      `File at exactly 25 MB should succeed (got ${nearLimitResponse.status})`
    );

    const filesBeforeOversize = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${oversizedAssignment.assignment_id}`)
    );

    const oversizedResponse = await uploadRequest(
      `/submissions/assignments/${oversizedAssignment.assignment_id}`,
      overLimitPath,
      studentToken,
      "over-25mb.bin"
    );

    console.log("Oversized File:", oversizedResponse.status);
    assert(
      oversizedResponse.status === 413,
      `File larger than 25 MB should return 413 (got ${oversizedResponse.status})`
    );

    const oversizedCount = await prisma.submission.count({
      where: {
        assignment_id: oversizedAssignment.assignment_id,
        student_id: studentId,
      },
    });
    assert(oversizedCount === 0, "Oversized upload must not create a Submission row");

    const filesAfterOversize = await listFilesRecursive(
      path.join(SUBMISSIONS_DIR, `assignment-${oversizedAssignment.assignment_id}`)
    );
    assert(
      filesAfterOversize.length === filesBeforeOversize.length,
      "Oversized upload must not leave a stored file"
    );

    console.log("Verify Oversized File Not Persisted: passed");

    // --------------------------------------------------
    // Submission Review: GET /submissions/assignments/:id
    // --------------------------------------------------

    const controllerPath = path.resolve("apps/backend/src/controllers/submission.controller.js");
    const routesPath = path.resolve("apps/backend/src/routes/submission.routes.js");
    const controllerSrc = await fs.readFile(controllerPath, "utf8");
    const routesSrc = await fs.readFile(routesPath, "utf8");

    assert(
      /export async function getAssignmentSubmissionsController\s*\(/.test(controllerSrc),
      "Controller should be named getAssignmentSubmissionsController"
    );
    assert(
      /await getAssignmentSubmissions\s*\(\s*assignment_id\s*,\s*faculty\.faculty_id\s*\)/.test(
        controllerSrc
      ),
      "Controller should call getAssignmentSubmissions(assignment_id, faculty.faculty_id)"
    );

    const controllerBody = controllerSrc.replace(
      /export async function getAssignmentSubmissionsController/,
      ""
    );
    assert(
      /getAssignmentSubmissionsController\s*\(/.test(controllerBody) === false,
      "getAssignmentSubmissionsController must not call itself"
    );
    assert(
      /authenticate/.test(routesSrc) && /authorize\("FACULTY"\)/.test(routesSrc),
      'GET /assignments/:id must be protected by authenticate and authorize("FACULTY")'
    );
    assert(
      /getAssignmentSubmissionsController/.test(routesSrc),
      "GET /assignments/:id must use getAssignmentSubmissionsController"
    );
    console.log("Verify Review Controller Wiring: passed");

    const facultyBUser = await createTemporaryUser({
      email: facultyBEmail,
      name: "E2E Submission Faculty B",
      role: "FACULTY",
      password: facultyPassword,
    });
    facultyBUserId = facultyBUser.user_id;
    assert(facultyBUserId, "Faculty B user should have user_id");

    const facultyBProfileResponse = await request(
      "POST",
      "/faculty",
      {
        userId: facultyBUserId,
        employee_id: employeeIdB,
        full_name: "E2E Submission Faculty B",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543211",
      },
      adminToken
    );
    assert(
      facultyBProfileResponse.status === 201,
      `Faculty B profile creation should return 201 (got ${facultyBProfileResponse.status})`
    );

    const facultyBLoginResponse = await request("POST", "/auth/login", {
      email: facultyBEmail,
      password: facultyPassword,
    });
    assert(facultyBLoginResponse.status === 200, "Faculty B login should return 200");
    const facultyBToken = facultyBLoginResponse.data.result.token;
    assert(facultyBToken, "Faculty B login should return a fresh JWT token");

    async function createReviewStudent({ email, name, rollSuffix }) {
      const registerResponse = await request("POST", "/auth/register", {
        name,
        email,
        password: studentPassword,
      });
      assert(
        registerResponse.status === 201,
        `Review student registration should return 201 for ${email}`
      );

      const userId = registerResponse.data.user.user_id;
      reviewStudentUserIds.push(userId);

      const profileResponse = await request(
        "POST",
        "/students",
        {
          userId,
          roll_number: rollNumberFor(testId, rollSuffix),
          full_name: name,
          dept_id: departmentId,
          semester: 5,
          section: "R",
          admission_year: 2024,
          phone: "9876543210",
        },
        adminToken
      );
      assert(
        profileResponse.status === 201,
        `Review student profile creation should return 201 for ${email}`
      );

      const loginResponse = await request("POST", "/auth/login", {
        email,
        password: studentPassword,
      });
      assert(loginResponse.status === 200, `Review student login should return 200 for ${email}`);

      return {
        userId,
        studentId: profileResponse.data.student.studentId,
        token: loginResponse.data.result.token,
        rollNumber: profileResponse.data.student.roll_number,
        fullName: name,
      };
    }

    const pendingStudent = await createReviewStudent({
      email: reviewPendingEmail,
      name: "E2E Review Pending Student",
      rollSuffix: "P",
    });
    const submittedStudent = await createReviewStudent({
      email: reviewSubmittedEmail,
      name: "E2E Review Submitted Student",
      rollSuffix: "S",
    });
    const lateStudent = await createReviewStudent({
      email: reviewLateEmail,
      name: "E2E Review Late Student",
      rollSuffix: "L",
    });
    const gradedStudent = await createReviewStudent({
      email: reviewGradedEmail,
      name: "E2E Review Graded Student",
      rollSuffix: "G",
    });

    const reviewAssignment = await createAssignmentViaApi({
      facultyToken,
      subjectId,
      title: `E2E Submission Review ${testId}`,
      allowLate: true,
      section: "R",
    });
    createdAssignmentIds.push(reviewAssignment.assignment_id);

    const zeroSubmissionReview = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      facultyToken
    );

    console.log("Review Zero Submissions:", zeroSubmissionReview.status);
    assert(
      zeroSubmissionReview.status === 200,
      `Zero-submission review should return 200, not 201 (got ${zeroSubmissionReview.status})`
    );
    assert(zeroSubmissionReview.status !== 201, "Review endpoint must return 200, not 201");

    const zeroPayload = zeroSubmissionReview.data?.result;
    assert(zeroPayload?.assignment, "Zero-submission review should include assignment");
    assert(Array.isArray(zeroPayload?.students), "Zero-submission review should include students");
    assert(
      zeroPayload.students.length >= 4,
      "Zero-submission review should include all section students even with no submissions"
    );
    assert(
      zeroPayload.students.every((student) => student.status === "Pending"),
      "All students should be Pending when there are zero submissions"
    );
    assert(
      zeroPayload.students.every((student) => student.submission === null),
      "Pending students should have null submission objects"
    );
    assertNoFileUrlLeak(zeroSubmissionReview.data, "Zero-submission review response");

    const reviewNoAuth = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`
    );
    console.log("Review No Authorization:", reviewNoAuth.status);
    assert(reviewNoAuth.status === 401, "Review without Authorization should return 401");

    const reviewStudentForbidden = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      studentToken
    );
    console.log("Review Student Forbidden:", reviewStudentForbidden.status);
    assert(reviewStudentForbidden.status === 403, "STUDENT review access should return 403");

    const reviewFacultyAllowed = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      facultyToken
    );
    console.log("Review Faculty Allowed:", reviewFacultyAllowed.status);
    assert(reviewFacultyAllowed.status === 200, "Owning FACULTY review access should return 200");

    const reviewFacultyB = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      facultyBToken
    );
    console.log("Review Unrelated Faculty:", reviewFacultyB.status);
    assert(reviewFacultyB.status === 404, "Non-owner FACULTY review access should return 404");
    assert(
      reviewFacultyB.data?.result == null && reviewFacultyB.data?.assignment == null,
      "Non-owner FACULTY response must not leak assignment data"
    );
    assert(
      /not found/i.test(reviewFacultyB.data?.message || ""),
      "Non-owner FACULTY should receive a not-found style message"
    );

    const reviewInvalidAbc = await request(
      "GET",
      "/submissions/assignments/abc",
      null,
      facultyToken
    );
    console.log("Review Invalid Assignment ID abc:", reviewInvalidAbc.status);
    assert(reviewInvalidAbc.status === 400, "Invalid assignment ID /abc should return 400");

    const reviewInvalidZero = await request(
      "GET",
      "/submissions/assignments/0",
      null,
      facultyToken
    );
    console.log("Review Invalid Assignment ID 0:", reviewInvalidZero.status);
    assert(reviewInvalidZero.status === 400, "Invalid assignment ID /0 should return 400");

    const reviewInvalidNegative = await request(
      "GET",
      "/submissions/assignments/-1",
      null,
      facultyToken
    );
    console.log("Review Invalid Assignment ID -1:", reviewInvalidNegative.status);
    assert(reviewInvalidNegative.status === 400, "Invalid assignment ID /-1 should return 400");

    const reviewNonexistent = await request(
      "GET",
      "/submissions/assignments/99999999",
      null,
      facultyToken
    );
    console.log("Review Nonexistent Assignment:", reviewNonexistent.status);
    assert(reviewNonexistent.status === 404, "Nonexistent assignment review should return 404");

    const submittedUpload = await uploadRequest(
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      pdfPath,
      submittedStudent.token,
      "review-submitted.pdf"
    );
    assert(
      submittedUpload.status === 201,
      `Submitted-status student upload should return 201 (got ${submittedUpload.status})`
    );

    const gradedUpload = await uploadRequest(
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      pdfPath,
      gradedStudent.token,
      "review-graded.pdf"
    );
    assert(
      gradedUpload.status === 201,
      `Graded-status student upload should return 201 (got ${gradedUpload.status})`
    );

    await prisma.submission.update({
      where: { submission_id: gradedUpload.data.submission.submission_id },
      data: {
        marks: 88,
        feedback: "Solid work",
        graded_at: new Date(),
      },
    });

    await prisma.submission.create({
      data: {
        assignment_id: reviewAssignment.assignment_id,
        student_id: lateStudent.studentId,
        file_url: `submissions/assignment-${reviewAssignment.assignment_id}/student-${lateStudent.studentId}/seeded-late.pdf`,
        submitted_at: new Date(),
        is_late: true,
        marks: null,
        feedback: null,
      },
    });

    const reviewSuccess = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      facultyToken
    );

    console.log("Review Success:", reviewSuccess.status);
    assert(reviewSuccess.status === 200, "Faculty review success should return 200");
    assert(reviewSuccess.status !== 201, "Faculty review success must not return 201");

    const reviewPayload = reviewSuccess.data?.result;
    assert(reviewPayload?.assignment, "Successful review response should include assignment");
    assert(
      Array.isArray(reviewPayload?.students),
      "Successful review response should include students"
    );

    const reviewAssignmentPayload = reviewPayload.assignment;
    assert(
      reviewAssignmentPayload.assignment_id === reviewAssignment.assignment_id,
      "Review assignment_id should match"
    );
    assert(reviewAssignmentPayload.title === reviewAssignment.title, "Review title should match");
    assert(
      reviewAssignmentPayload.subject_id === reviewAssignment.subject_id,
      "Review subject_id should match"
    );
    assert(
      reviewAssignmentPayload.section === "R",
      "Review section should match assignment section"
    );
    assert(reviewAssignmentPayload.deadline, "Review deadline should be present");
    assert(
      Number(reviewAssignmentPayload.max_marks) === Number(reviewAssignment.max_marks),
      "Review max_marks should match"
    );

    const expectedStudentIds = [
      pendingStudent.studentId,
      submittedStudent.studentId,
      lateStudent.studentId,
      gradedStudent.studentId,
    ];

    for (const expectedId of expectedStudentIds) {
      assert(
        findStudentResult(reviewPayload.students, expectedId),
        `Review students array must include student_id ${expectedId}`
      );
    }

    assert(
      findStudentResult(reviewPayload.students, pendingStudent.studentId),
      "Students without submissions must still appear in the students array (FR-25)"
    );

    for (const student of reviewPayload.students) {
      assert(student.student_id != null, "Each student result needs student_id");
      assert(student.roll_number != null, "Each student result needs roll_number");
      assert(typeof student.full_name === "string", "Each student result needs full_name");
      assert("submission" in student, "Each student result needs submission field");
      assert(typeof student.status === "string", "Each student result needs status");
    }

    const pendingResult = findStudentResult(reviewPayload.students, pendingStudent.studentId);
    assert(pendingResult.status === "Pending", "Student without submission should be Pending");
    assert(pendingResult.submission === null, "Pending student submission should be null");
    assert(
      pendingResult.roll_number === pendingStudent.rollNumber,
      "Pending student roll_number should match"
    );
    assert(
      pendingResult.full_name === pendingStudent.fullName,
      "Pending student full_name should match"
    );

    const submittedResult = findStudentResult(reviewPayload.students, submittedStudent.studentId);
    assert(
      submittedResult.status === "Submitted",
      "On-time ungraded submission should be Submitted"
    );
    assert(submittedResult.submission, "Submitted student should include submission object");
    assert(
      submittedResult.submission.submission_id === submittedUpload.data.submission.submission_id,
      "Submitted submission_id should match"
    );
    assert(submittedResult.submission.submitted_at, "Submitted submission needs submitted_at");
    assert(
      submittedResult.submission.is_late === false,
      "Submitted submission is_late should be false"
    );
    assert(submittedResult.submission.marks == null, "Submitted submission marks should be null");
    assert(
      submittedResult.submission.feedback == null,
      "Submitted submission feedback should be null"
    );
    assert(
      submittedResult.submission.status === "Submitted",
      "Submitted submission.status should be Submitted"
    );

    const lateResult = findStudentResult(reviewPayload.students, lateStudent.studentId);
    assert(lateResult.status === "Late", "Late ungraded submission should be Late");
    assert(lateResult.submission, "Late student should include submission object");
    assert(lateResult.submission.is_late === true, "Late submission is_late should be true");
    assert(lateResult.submission.marks == null, "Late submission marks should be null");
    assert(lateResult.submission.status === "Late", "Late submission.status should be Late");
    assert(lateResult.submission.submission_id, "Late submission needs submission_id");
    assert(lateResult.submission.submitted_at, "Late submission needs submitted_at");
    assert("feedback" in lateResult.submission, "Late submission needs feedback field");

    const gradedResult = findStudentResult(reviewPayload.students, gradedStudent.studentId);
    assert(gradedResult.status === "Graded", "Submission with marks should be Graded");
    assert(gradedResult.submission, "Graded student should include submission object");
    assert(
      Number(gradedResult.submission.marks) === 88,
      "Graded submission marks should match seeded value"
    );
    assert(
      gradedResult.submission.feedback === "Solid work",
      "Graded submission feedback should match seeded value"
    );
    assert(
      gradedResult.submission.status === "Graded",
      "Graded submission.status should be Graded"
    );
    assert(gradedResult.submission.submission_id, "Graded submission needs submission_id");
    assert(gradedResult.submission.submitted_at, "Graded submission needs submitted_at");
    assert("is_late" in gradedResult.submission, "Graded submission needs is_late field");

    assertNoFileUrlLeak(reviewSuccess.data, "Successful review response");
    for (const student of reviewPayload.students) {
      if (student.submission) {
        assert(
          Object.prototype.hasOwnProperty.call(student.submission, "file_url") === false,
          "Submission overview objects must not include file_url"
        );
      }
    }

    console.log("Verify Review Success Payload: passed");
    console.log("Verify Review Student Statuses: passed");
    console.log("Verify Review Ownership Isolation: passed");

    // --------------------------------------------------
    // Faculty Submission Grading: PATCH /submissions/:id/grade
    // --------------------------------------------------

    const gradeTargetSubmissionId = submittedUpload.data.submission.submission_id;
    assert(
      gradeTargetSubmissionId,
      "Review submitted upload should provide a submission_id to grade"
    );

    const gradeTargetBefore = await prisma.submission.findUnique({
      where: { submission_id: gradeTargetSubmissionId },
    });
    assert(gradeTargetBefore, "Grade target submission should exist before grading tests");
    assert(
      gradeTargetBefore.marks == null,
      "Grade target should start ungraded for clean assertions"
    );

    const gradeNoAuth = await request("PATCH", `/submissions/${gradeTargetSubmissionId}/grade`, {
      marks: 85,
      feedback: "Good work.",
    });
    console.log("Grade No Authorization:", gradeNoAuth.status);
    assert(gradeNoAuth.status === 401, "Grading without Authorization should return 401");

    const gradeStudentForbidden = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 85,
        feedback: "Good work.",
      },
      studentToken
    );
    console.log("Grade Student Forbidden:", gradeStudentForbidden.status);
    assert(gradeStudentForbidden.status === 403, "STUDENT grading should return 403");

    const gradeInvalidAbc = await request(
      "PATCH",
      "/submissions/abc/grade",
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyToken
    );
    console.log("Grade Invalid Submission ID:", gradeInvalidAbc.status);
    assert(gradeInvalidAbc.status === 400, "Invalid submission ID /abc should return 400");

    const gradeInvalidZero = await request(
      "PATCH",
      "/submissions/0/grade",
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyToken
    );
    assert(gradeInvalidZero.status === 400, "Invalid submission ID /0 should return 400");

    const gradeInvalidNegative = await request(
      "PATCH",
      "/submissions/-1/grade",
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyToken
    );
    assert(gradeInvalidNegative.status === 400, "Invalid submission ID /-1 should return 400");

    const gradeNonexistent = await request(
      "PATCH",
      "/submissions/99999999/grade",
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyToken
    );
    console.log("Grade Nonexistent Submission:", gradeNonexistent.status);
    assert(gradeNonexistent.status === 404, "Nonexistent submission grading should return 404");

    const gradeUnrelatedFaculty = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyBToken
    );
    console.log("Grade Unrelated Faculty:", gradeUnrelatedFaculty.status);
    assert(gradeUnrelatedFaculty.status === 404, "Non-owner FACULTY grading should return 404");

    const afterUnrelatedFaculty = await prisma.submission.findUnique({
      where: { submission_id: gradeTargetSubmissionId },
    });
    assert(
      afterUnrelatedFaculty,
      "Submission should still exist after unrelated faculty grade attempt"
    );
    assert(
      afterUnrelatedFaculty.marks === gradeTargetBefore.marks,
      "Unrelated faculty must not modify marks"
    );
    assert(
      afterUnrelatedFaculty.feedback === gradeTargetBefore.feedback,
      "Unrelated faculty must not modify feedback"
    );
    assert(
      afterUnrelatedFaculty.graded_at === gradeTargetBefore.graded_at,
      "Unrelated faculty must not modify graded_at"
    );

    const gradeValid = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 85,
        feedback: "Good work.",
      },
      facultyToken
    );
    console.log("Grade Valid Submission:", gradeValid.status);
    assert(gradeValid.status === 200, "Valid faculty grading should return 200");
    assert(
      gradeValid.data?.message === "Submission graded successfully",
      'Valid grade response message should be "Submission graded successfully"'
    );
    assert(gradeValid.data?.submission, "Valid grade response should include submission");
    assert(
      Number(gradeValid.data.submission.marks) === 85,
      "Valid grade response marks should be 85"
    );
    assert(
      gradeValid.data.submission.feedback === "Good work.",
      "Valid grade response feedback should be persisted in response"
    );
    assert(gradeValid.data.submission.graded_at, "Valid grade response should populate graded_at");

    const gradePersisted = await prisma.submission.findUnique({
      where: { submission_id: gradeTargetSubmissionId },
    });
    assert(gradePersisted, "Graded submission should exist in database");
    assert(Number(gradePersisted.marks) === 85, "Persisted marks should be 85");
    assert(gradePersisted.feedback === "Good work.", "Persisted feedback should match");
    assert(gradePersisted.graded_at instanceof Date, "Persisted graded_at should not be null");
    console.log("Verify Grade Persistence: passed");

    const reviewAfterGrade = await request(
      "GET",
      `/submissions/assignments/${reviewAssignment.assignment_id}`,
      null,
      facultyToken
    );
    assert(
      reviewAfterGrade.status === 200,
      `Review after grading should return 200 (got ${reviewAfterGrade.status})`
    );
    const reviewAfterGradeStudent = findStudentResult(
      reviewAfterGrade.data?.result?.students,
      submittedStudent.studentId
    );
    assert(reviewAfterGradeStudent, "Review after grading should still include the graded student");
    assert(reviewAfterGradeStudent.status === "Graded", "Review student status should be Graded");
    assert(
      reviewAfterGradeStudent.submission?.status === "Graded",
      "Review submission.status should be Graded"
    );
    assert(
      Number(reviewAfterGradeStudent.submission.marks) === 85,
      "Review submission.marks should equal graded marks"
    );
    assert(
      reviewAfterGradeStudent.submission.feedback === "Good work.",
      "Review submission.feedback should equal graded feedback"
    );
    assert(
      Object.prototype.hasOwnProperty.call(reviewAfterGradeStudent.submission, "graded_at") ===
        false,
      "Review API should not expose graded_at when it is not part of the overview payload"
    );
    console.log("Verify Graded Status: passed");

    const maxMarks = Number(reviewAssignment.max_marks);
    assert(
      Number.isInteger(maxMarks) && maxMarks > 0,
      "Review assignment max_marks should be usable"
    );

    const gradeZeroMarks = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 0,
        feedback: "Needs improvement.",
      },
      facultyToken
    );
    console.log("Grade Zero Marks:", gradeZeroMarks.status);
    assert(gradeZeroMarks.status === 200, "marks = 0 should return 200");
    assert(
      Number(gradeZeroMarks.data?.submission?.marks) === 0,
      "Zero marks should persist in response"
    );

    const gradeMaximumMarks = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: maxMarks,
        feedback: "Full marks.",
      },
      facultyToken
    );
    console.log("Grade Maximum Marks:", gradeMaximumMarks.status);
    assert(gradeMaximumMarks.status === 200, "marks = max_marks should return 200");
    assert(
      Number(gradeMaximumMarks.data?.submission?.marks) === maxMarks,
      "Maximum marks should persist in response"
    );

    const gradeExcessiveMarks = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: maxMarks + 1,
        feedback: "Too high.",
      },
      facultyToken
    );
    console.log("Grade Excessive Marks:", gradeExcessiveMarks.status);
    assert(gradeExcessiveMarks.status === 400, "marks > max_marks should return 400");

    const gradeNegativeMarks = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: -1,
        feedback: "Negative.",
      },
      facultyToken
    );
    console.log("Grade Negative Marks:", gradeNegativeMarks.status);
    assert(gradeNegativeMarks.status === 400, "marks < 0 should return 400");

    const gradeDecimalMarks = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 85.5,
        feedback: "Decimal.",
      },
      facultyToken
    );
    console.log("Grade Decimal Marks:", gradeDecimalMarks.status);
    assert(gradeDecimalMarks.status === 400, "non-integer marks should return 400");

    const gradeFeedbackOmitted = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 72,
      },
      facultyToken
    );
    assert(gradeFeedbackOmitted.status === 200, "Omitting feedback should return 200");

    const gradeEmptyFeedback = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 72,
        feedback: "",
      },
      facultyToken
    );
    console.log("Grade Empty Feedback:", gradeEmptyFeedback.status);
    assert(gradeEmptyFeedback.status === 400, 'feedback = "" should return 400');

    const gradeWhitespaceFeedback = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 72,
        feedback: "   ",
      },
      facultyToken
    );
    assert(gradeWhitespaceFeedback.status === 400, "Whitespace-only feedback should return 400");

    const gradeLongFeedback = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 72,
        feedback: "x".repeat(501),
      },
      facultyToken
    );
    console.log("Grade Long Feedback:", gradeLongFeedback.status);
    assert(
      gradeLongFeedback.status === 400,
      "feedback longer than 500 characters should return 400"
    );

    const firstRegrade = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 70,
        feedback: "First grade pass.",
      },
      facultyToken
    );
    assert(firstRegrade.status === 200, "Initial re-grade setup should return 200");
    const firstGradedAt = new Date(firstRegrade.data.submission.graded_at);
    assert(!Number.isNaN(firstGradedAt.getTime()), "First grade graded_at should be a valid date");

    await new Promise((resolve) => setTimeout(resolve, 25));

    const regradeResponse = await request(
      "PATCH",
      `/submissions/${gradeTargetSubmissionId}/grade`,
      {
        marks: 92,
        feedback: "Improved after revision.",
      },
      facultyToken
    );
    console.log("Re-grade Submission:", regradeResponse.status);
    assert(regradeResponse.status === 200, "Re-grading should return 200");
    assert(
      Number(regradeResponse.data?.submission?.marks) === 92,
      "Re-grade response marks should be the latest value"
    );
    assert(
      regradeResponse.data?.submission?.feedback === "Improved after revision.",
      "Re-grade response feedback should be the latest value"
    );
    assert(
      regradeResponse.data?.submission?.graded_at,
      "Re-grade response should populate graded_at"
    );

    const regradePersisted = await prisma.submission.findUnique({
      where: { submission_id: gradeTargetSubmissionId },
    });
    assert(Number(regradePersisted.marks) === 92, "Re-grade persisted marks should be 92");
    assert(
      regradePersisted.feedback === "Improved after revision.",
      "Re-grade persisted feedback should match latest value"
    );
    assert(
      regradePersisted.graded_at instanceof Date,
      "Re-grade persisted graded_at should not be null"
    );
    assert(
      regradePersisted.graded_at.getTime() >= firstGradedAt.getTime(),
      "Re-grade graded_at should be updated/populated relative to the previous grade"
    );
    console.log("Verify Re-grade Persistence: passed");

    // --------------------------------------------------
    // Failed operations leave consistent storage/DB state
    // --------------------------------------------------

    const failedConsistencyChecks = [
      {
        label: "missing file",
        status: missingFileResponse.status,
      },
      {
        label: "nonexistent assignment",
        status: nonexistentIdResponse.status,
      },
      {
        label: "past deadline rejected",
        status: pastRejectResponse.status,
      },
      {
        label: "oversized",
        status: oversizedResponse.status,
      },
    ];

    for (const check of failedConsistencyChecks) {
      assert(check.status >= 400, `${check.label} should be a failed submission response`);
    }

    console.log("Verify Failed Ops Storage/DB Consistency: passed");

    console.log("\n✓ All Submission API tests passed");
  } finally {
    await cleanupTestData({
      assignmentIds: createdAssignmentIds,
      subjectCodes: [subjectCode],
      facultyUserIds: [facultyUserId, facultyBUserId],
      studentUserId,
      studentUserIds: reviewStudentUserIds,
      departmentId,
      userEmails: [facultyEmail, studentEmail, ephemeralAdminEmail, ...reviewUserEmails],
    });

    await prisma.$disconnect();
  }
}

runTests().catch((error) => {
  console.error("\nSubmission E2E tests failed:");
  console.error(error.message || error);
  process.exit(1);
});
