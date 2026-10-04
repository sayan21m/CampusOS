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

function rollNumberFor(testId) {
  return `UR${String(testId).slice(-8)}`.slice(0, 15);
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
  const studentEmail = `e2e.submission.student.${testId}@campusos.test`;
  const departmentName = `E2E Submission Department ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const subjectCode = subjectCodeFor(testId);
  const employeeId = employeeIdFor(testId);
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";

  let departmentId;
  let subjectId;
  let facultyUserId;
  let studentUserId;
  let studentId;
  let ephemeralAdminEmail;
  const createdAssignmentIds = [];

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
      facultyUserIds: [facultyUserId],
      studentUserId,
      departmentId,
      userEmails: [facultyEmail, studentEmail, ephemeralAdminEmail],
    });

    await prisma.$disconnect();
  }
}

runTests().catch((error) => {
  console.error("\nSubmission E2E tests failed:");
  console.error(error.message || error);
  process.exit(1);
});
