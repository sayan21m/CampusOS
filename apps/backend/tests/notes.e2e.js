import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";

const BASE_URL = "http://localhost:3000/api/v1";
const TEMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), ".tmp-notes-e2e");
const STORAGE_ROOT = path.resolve("apps/backend/storage");

const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] >>endobj
trailer<< /Root 1 0 R >>
%%EOF`
);

const REPLACEMENT_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] >>endobj
trailer<< /Root 1 0 R >>
%%EOF
%replaced`
);

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

  return { status: response.status, data };
}

async function uploadNotes(endpoint, fields, filePath, token = null, method = "POST") {
  const buffer = await fs.readFile(filePath);
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }

  form.append("file", new Blob([buffer], { type: "application/pdf" }), path.basename(filePath));

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
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

  return { status: response.status, data };
}

async function binaryRequest(endpoint, token = null) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(60000),
  });

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let data = null;
  if (response.status !== 200) {
    const text = buffer.toString("utf8");
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    buffer,
    data,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function subjectCodeFor(testId, suffix = "") {
  return `NS${String(testId).slice(-8)}${suffix}`.slice(0, 15);
}

function deptCodeFor(testId, prefix = "ND") {
  return `${prefix}${String(testId).slice(-8)}`.slice(0, 10);
}

function employeeIdFor(testId, suffix = "") {
  return `NF${String(testId).slice(-8)}${suffix}`.slice(0, 15);
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

  const email = `e2e.notes.admin.${testId}@campusos.test`;
  const password = "Admin@123456";

  await createTemporaryUser({
    email,
    name: "E2E Notes Admin",
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
  notesIds,
  timetableIds,
  subjectIds,
  facultyUserIds,
  studentUserIds,
  departmentIds,
  userEmails,
}) {
  const notes = (notesIds || []).filter(Boolean);
  if (notes.length > 0) {
    const rows = await prisma.notes.findMany({
      where: { notes_id: { in: notes } },
      select: { storage_key: true },
    });

    await prisma.notes.deleteMany({
      where: { notes_id: { in: notes } },
    });

    for (const row of rows) {
      try {
        await fs.unlink(path.resolve(STORAGE_ROOT, row.storage_key));
      } catch {
        // file may already be removed by delete API
      }
    }
  }

  const slots = (timetableIds || []).filter(Boolean);
  if (slots.length > 0) {
    await prisma.timetableException.deleteMany({
      where: { timetable_id: { in: slots } },
    });
    await prisma.timetableSlot.deleteMany({
      where: { timetable_id: { in: slots } },
    });
  }

  const subjects = (subjectIds || []).filter(Boolean);
  if (subjects.length > 0) {
    await prisma.subject.deleteMany({
      where: { subject_id: { in: subjects } },
    });
  }

  const facultyIds = (facultyUserIds || []).filter(Boolean);
  if (facultyIds.length > 0) {
    await prisma.faculty.deleteMany({
      where: { user_id: { in: facultyIds } },
    });
  }

  const studentIds = (studentUserIds || []).filter(Boolean);
  if (studentIds.length > 0) {
    await prisma.student.deleteMany({
      where: { user_id: { in: studentIds } },
    });
  }

  const emails = (userEmails || []).filter(Boolean);
  if (emails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: emails } },
    });
  }

  const departments = (departmentIds || []).filter(Boolean);
  if (departments.length > 0) {
    await prisma.department.deleteMany({
      where: { dept_id: { in: departments } },
    });
  }
}

async function runTests() {
  console.log("\nRunning Notes API tests...\n");

  const testId = Date.now();
  const facultyEmail = `e2e.notes.faculty.${testId}@campusos.test`;
  const otherFacultyEmail = `e2e.notes.faculty2.${testId}@campusos.test`;
  const studentEmail = `e2e.notes.student.${testId}@campusos.test`;
  const otherStudentEmail = `e2e.notes.student2.${testId}@campusos.test`;
  const departmentName = `E2E Notes Department ${testId}`;
  const otherDepartmentName = `E2E Notes Other Dept ${testId}`;
  const departmentCode = deptCodeFor(testId);
  const otherDepartmentCode = deptCodeFor(testId, "NO");
  const subjectCode = subjectCodeFor(testId);
  const otherSubjectCode = subjectCodeFor(testId, "O");
  const employeeId = employeeIdFor(testId);
  const otherEmployeeId = employeeIdFor(testId, "B");
  const facultyPassword = "Faculty@123456";
  const studentPassword = "Student@123";

  let departmentId = null;
  let otherDepartmentId = null;
  let subjectId = null;
  let otherSubjectId = null;
  let facultyUserId = null;
  let otherFacultyUserId = null;
  let studentUserId = null;
  let otherStudentUserId = null;
  let ephemeralAdminEmail = null;
  let timetableId = null;
  const createdNotesIds = [];
  const createdSubjectIds = [];
  const createdTimetableIds = [];

  const pdfPath = path.join(TEMP_DIR, `notes-${testId}.pdf`);
  const replacementPdfPath = path.join(TEMP_DIR, `notes-replaced-${testId}.pdf`);

  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.writeFile(pdfPath, MINIMAL_PDF);
    await fs.writeFile(replacementPdfPath, REPLACEMENT_PDF);

    const health = await fetch("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "health@check", password: "x" }),
    }).catch(() => null);

    assert(health, "Backend must be running on localhost:3000 for notes e2e");

    // --------------------------------------------------
    // Setup
    // --------------------------------------------------

    const adminAuth = await getAdminToken(testId);
    const adminToken = adminAuth.token;
    ephemeralAdminEmail = adminAuth.ephemeralAdminEmail;
    console.log("Login Admin: 200");

    const departmentResponse = await request(
      "POST",
      "/departments",
      { dept_name: departmentName, dept_code: departmentCode },
      adminToken
    );
    assert(departmentResponse.status === 201, "Department creation should return 201");
    departmentId = departmentResponse.data.department.dept_id;
    console.log("Create Department:", departmentResponse.status);

    const otherDepartmentResponse = await request(
      "POST",
      "/departments",
      { dept_name: otherDepartmentName, dept_code: otherDepartmentCode },
      adminToken
    );
    assert(otherDepartmentResponse.status === 201, "Other department creation should return 201");
    otherDepartmentId = otherDepartmentResponse.data.department.dept_id;

    const subjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: subjectCode,
        subject_name: "E2E Notes Subject",
        dept_id: departmentId,
        semester: 5,
        credits: 4,
      },
      adminToken
    );
    assert(subjectResponse.status === 201, "Subject creation should return 201");
    subjectId =
      subjectResponse.data.subject.subjectId ?? subjectResponse.data.subject.subject_id;
    createdSubjectIds.push(subjectId);
    console.log("Create Subject:", subjectResponse.status);

    const otherSubjectResponse = await request(
      "POST",
      "/subjects",
      {
        subject_code: otherSubjectCode,
        subject_name: "E2E Notes Other Subject",
        dept_id: otherDepartmentId,
        semester: 5,
        credits: 3,
      },
      adminToken
    );
    assert(otherSubjectResponse.status === 201, "Other subject creation should return 201");
    otherSubjectId =
      otherSubjectResponse.data.subject.subjectId ??
      otherSubjectResponse.data.subject.subject_id;
    createdSubjectIds.push(otherSubjectId);

    const facultyUser = await createTemporaryUser({
      email: facultyEmail,
      name: "E2E Notes Faculty",
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
        full_name: "E2E Notes Faculty Member",
        dept_id: departmentId,
        designation: "Assistant Professor",
        phone: "9876543210",
      },
      adminToken
    );
    assert(facultyResponse.status === 201, "Faculty creation should return 201");
    const facultyId =
      facultyResponse.data.faculty.facultyId ?? facultyResponse.data.faculty.faculty_id;
    console.log("Create Faculty Profile:", facultyResponse.status);

    const otherFacultyUser = await createTemporaryUser({
      email: otherFacultyEmail,
      name: "E2E Notes Other Faculty",
      role: "FACULTY",
      password: facultyPassword,
    });
    otherFacultyUserId = otherFacultyUser.user_id;

    const otherFacultyResponse = await request(
      "POST",
      "/faculty",
      {
        userId: otherFacultyUserId,
        employee_id: otherEmployeeId,
        full_name: "E2E Notes Other Faculty",
        dept_id: otherDepartmentId,
        designation: "Professor",
        phone: "9876543212",
      },
      adminToken
    );
    assert(otherFacultyResponse.status === 201, "Other faculty creation should return 201");

    const slotResponse = await request(
      "POST",
      "/timetable",
      {
        subject_id: subjectId,
        faculty_id: facultyId,
        dept_id: departmentId,
        semester: 5,
        section: "A",
        day_of_week: 1,
        period: 1,
        room: "CSE-101",
        start_time: "09:00",
        end_time: "09:50",
      },
      adminToken
    );
    assert(slotResponse.status === 201, "Timetable slot creation should return 201");
    timetableId =
      slotResponse.data.timetable?.timetable_id ??
      slotResponse.data.slot?.timetable_id ??
      slotResponse.data.timetable_id;
    assert(timetableId, "Timetable response should include timetable_id");
    createdTimetableIds.push(timetableId);
    console.log("Create Timetable Slot:", slotResponse.status);

    const facultyLogin = await request("POST", "/auth/login", {
      email: facultyEmail,
      password: facultyPassword,
    });
    assert(facultyLogin.status === 200, "Faculty login should return 200");
    const facultyToken = facultyLogin.data.result.token;

    const otherFacultyLogin = await request("POST", "/auth/login", {
      email: otherFacultyEmail,
      password: facultyPassword,
    });
    assert(otherFacultyLogin.status === 200, "Other faculty login should return 200");
    const otherFacultyToken = otherFacultyLogin.data.result.token;

    const registerResponse = await request("POST", "/auth/register", {
      name: "E2E Notes Student",
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
        full_name: "E2E Notes Student",
        dept_id: departmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543211",
      },
      adminToken
    );
    assert(studentProfileResponse.status === 201, "Student profile creation should return 201");

    const studentLogin = await request("POST", "/auth/login", {
      email: studentEmail,
      password: studentPassword,
    });
    assert(studentLogin.status === 200, "Student login should return 200");
    const studentToken = studentLogin.data.result.token;

    const otherStudentRegister = await request("POST", "/auth/register", {
      name: "E2E Notes Other Student",
      email: otherStudentEmail,
      password: studentPassword,
    });
    assert(otherStudentRegister.status === 201, "Other student registration should return 201");
    otherStudentUserId = otherStudentRegister.data.user.user_id;

    const otherStudentProfile = await request(
      "POST",
      "/students",
      {
        userId: otherStudentUserId,
        roll_number: rollNumberFor(testId, "B"),
        full_name: "E2E Notes Other Student",
        dept_id: otherDepartmentId,
        semester: 5,
        section: "A",
        admission_year: 2024,
        phone: "9876543213",
      },
      adminToken
    );
    assert(otherStudentProfile.status === 201, "Other student profile creation should return 201");

    const otherStudentLogin = await request("POST", "/auth/login", {
      email: otherStudentEmail,
      password: studentPassword,
    });
    assert(otherStudentLogin.status === 200, "Other student login should return 200");
    const otherStudentToken = otherStudentLogin.data.result.token;

    const metadata = {
      subject_id: subjectId,
      title: `E2E Notes ${testId}`,
      description: "Unit test material",
      unit_number: 3,
      material_type: "LECTURE_NOTES",
      academic_year: 2026,
    };

    // --------------------------------------------------
    // Auth / role guards
    // --------------------------------------------------

    const unauthCreate = await uploadNotes("/notes", metadata, pdfPath);
    console.log("Create Notes (no auth):", unauthCreate.status);
    assert(unauthCreate.status === 401, "Unauthenticated create should return 401");

    const studentCreate = await uploadNotes("/notes", metadata, pdfPath, studentToken);
    console.log("Create Notes (student):", studentCreate.status);
    assert(studentCreate.status === 403, "Student create should return 403");

    const invalidCreate = await uploadNotes(
      "/notes",
      { ...metadata, title: "" },
      pdfPath,
      facultyToken
    );
    console.log("Create Notes (invalid):", invalidCreate.status);
    assert(invalidCreate.status === 400, "Invalid create should return 400");

    const crossDeptCreate = await uploadNotes(
      "/notes",
      { ...metadata, subject_id: otherSubjectId },
      pdfPath,
      facultyToken
    );
    console.log("Create Notes (cross dept):", crossDeptCreate.status);
    assert(crossDeptCreate.status === 403, "Cross-department create should return 403");

    // --------------------------------------------------
    // Create + list
    // --------------------------------------------------

    const createResponse = await uploadNotes("/notes", metadata, pdfPath, facultyToken);
    console.log("Create Notes (faculty):", createResponse.status);
    assert(createResponse.status === 201, "Faculty create should return 201");
    const note = createResponse.data.notes;
    assert(note?.notes_id, "Create response should include notes_id");
    createdNotesIds.push(note.notes_id);
    assert(note.file_size_bytes, "Create response should include file_size_bytes");
    assert(
      !/storage_key|passwordHash|tokenHash/i.test(JSON.stringify(createResponse.data)),
      "Create response must not expose storage_key or secrets"
    );

    const facultyList = await request(
      "GET",
      `/notes/subject/${subjectId}/unit/3`,
      null,
      facultyToken
    );
    console.log("List Notes (faculty):", facultyList.status);
    assert(facultyList.status === 200, "Faculty list should return 200");
    assert(
      facultyList.data.notes.some((item) => item.notes_id === note.notes_id),
      "Faculty list should include uploaded note"
    );

    const studentList = await request(
      "GET",
      `/notes/subject/${subjectId}/unit/3`,
      null,
      studentToken
    );
    console.log("List Notes (student):", studentList.status);
    assert(studentList.status === 200, "Student list should return 200");
    assert(
      studentList.data.notes.some((item) => item.notes_id === note.notes_id),
      "Student in same dept/semester should see the note"
    );

    const otherStudentList = await request(
      "GET",
      `/notes/subject/${subjectId}/unit/3`,
      null,
      otherStudentToken
    );
    console.log("List Notes (other dept student):", otherStudentList.status);
    assert(otherStudentList.status === 200, "Other student list should return 200");
    assert(
      !otherStudentList.data.notes.some((item) => item.notes_id === note.notes_id),
      "Other department student should not see the note"
    );

    // --------------------------------------------------
    // Download + preview
    // --------------------------------------------------

    const downloadNoAuth = await binaryRequest(`/notes/${note.notes_id}/download`);
    console.log("Download (no auth):", downloadNoAuth.status);
    assert(downloadNoAuth.status === 401, "Download without auth should return 401");

    const downloadOk = await binaryRequest(`/notes/${note.notes_id}/download`, studentToken);
    console.log("Download (student):", downloadOk.status);
    assert(downloadOk.status === 200, "Student download should return 200");
    assert(
      downloadOk.headers.get("content-type")?.includes("application/octet-stream"),
      "Download should use application/octet-stream"
    );
    assert(downloadOk.buffer.length > 0, "Download body should not be empty");

    const downloadForbidden = await binaryRequest(
      `/notes/${note.notes_id}/download`,
      otherStudentToken
    );
    console.log("Download (other student):", downloadForbidden.status);
    assert(downloadForbidden.status === 403, "Other student download should return 403");

    const previewOk = await binaryRequest(`/notes/${note.notes_id}/preview`, facultyToken);
    console.log("Preview (faculty PDF):", previewOk.status);
    assert(previewOk.status === 200, "PDF preview should return 200");
    assert(
      previewOk.headers.get("content-type")?.includes("application/pdf"),
      "Preview should use application/pdf"
    );

    // --------------------------------------------------
    // Replace
    // --------------------------------------------------

    const replaceOtherFaculty = await uploadNotes(
      `/notes/${note.notes_id}`,
      { title: "Hijack" },
      replacementPdfPath,
      otherFacultyToken,
      "PUT"
    );
    console.log("Replace Notes (other faculty):", replaceOtherFaculty.status);
    assert(replaceOtherFaculty.status === 403, "Non-owner replace should return 403");

    const replaceOk = await uploadNotes(
      `/notes/${note.notes_id}`,
      {
        title: `E2E Notes Replaced ${testId}`,
        description: "Updated description",
        unit_number: 3,
        material_type: "PRESENTATIONS",
        academic_year: 2026,
      },
      replacementPdfPath,
      facultyToken,
      "PUT"
    );
    console.log("Replace Notes (owner):", replaceOk.status);
    assert(replaceOk.status === 200, "Owner replace should return 200");
    assert(
      replaceOk.data.notes.title === `E2E Notes Replaced ${testId}`,
      "Replace should update title"
    );
    assert(
      replaceOk.data.notes.material_type === "PRESENTATIONS",
      "Replace should update material_type"
    );

    const downloadReplaced = await binaryRequest(
      `/notes/${note.notes_id}/download`,
      studentToken
    );
    assert(downloadReplaced.status === 200, "Download after replace should return 200");
    assert(
      downloadReplaced.buffer.includes(Buffer.from("%replaced")) ||
        downloadReplaced.buffer.length === REPLACEMENT_PDF.length,
      "Downloaded file should reflect replacement content"
    );

    // --------------------------------------------------
    // Delete
    // --------------------------------------------------

    const deleteOtherFaculty = await request(
      "DELETE",
      `/notes/${note.notes_id}`,
      null,
      otherFacultyToken
    );
    console.log("Delete Notes (other faculty):", deleteOtherFaculty.status);
    assert(deleteOtherFaculty.status === 403, "Non-owner delete should return 403");

    const deleteOk = await request("DELETE", `/notes/${note.notes_id}`, null, facultyToken);
    console.log("Delete Notes (owner):", deleteOk.status);
    assert(deleteOk.status === 200, "Owner delete should return 200");

    const deletedIndex = createdNotesIds.indexOf(note.notes_id);
    if (deletedIndex >= 0) {
      createdNotesIds.splice(deletedIndex, 1);
    }

    const listAfterDelete = await request(
      "GET",
      `/notes/subject/${subjectId}/unit/3`,
      null,
      facultyToken
    );
    assert(listAfterDelete.status === 200, "List after delete should return 200");
    assert(
      !listAfterDelete.data.notes.some((item) => item.notes_id === note.notes_id),
      "Deleted note should not appear in list"
    );

    const downloadAfterDelete = await binaryRequest(
      `/notes/${note.notes_id}/download`,
      facultyToken
    );
    console.log("Download after delete:", downloadAfterDelete.status);
    assert(downloadAfterDelete.status === 404, "Download after delete should return 404");

    const deleteInvalid = await request("DELETE", "/notes/abc", null, facultyToken);
    console.log("Delete Notes (invalid id):", deleteInvalid.status);
    assert(deleteInvalid.status === 400, "Invalid delete id should return 400");

    console.log("\nAll Notes API tests passed.\n");
  } catch (error) {
    console.error("\nNotes API tests failed:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await cleanupTestData({
        notesIds: createdNotesIds,
        timetableIds: createdTimetableIds,
        subjectIds: createdSubjectIds,
        facultyUserIds: [facultyUserId, otherFacultyUserId].filter(Boolean),
        studentUserIds: [studentUserId, otherStudentUserId].filter(Boolean),
        departmentIds: [departmentId, otherDepartmentId].filter(Boolean),
        userEmails: [
          facultyEmail,
          otherFacultyEmail,
          studentEmail,
          otherStudentEmail,
          ephemeralAdminEmail,
        ].filter(Boolean),
      });
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError.message);
      process.exitCode = 1;
    }

    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup errors
    }

    await prisma.$disconnect();
  }
}

runTests();
