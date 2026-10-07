/**
 * Seeds local test users (admin, faculty, students) and sample files.
 *
 * Output (gitignored):
 *   apps/backend/tests/local-data/
 *     users.json   — credentials + ids
 *     files/       — copies of docs/ for uploads/testing
 *
 * Usage:
 *   node apps/backend/tests/seed-local-users.js
 */
import "dotenv/config";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT_DIR = path.join(__dirname, "local-data");
const FILES_DIR = path.join(OUT_DIR, "files");
const DOCS_DIR = path.join(ROOT, "docs");

const PASSWORD = "CampusOS@123";

const DEPARTMENT = {
  dept_name: "Seed Computer Science",
  dept_code: "SEEDCS",
};

const ADMIN = {
  name: "Seed Admin",
  email: "seed.admin@campusos.local",
  role: "ADMINISTRATOR",
};

const FACULTY = [
  {
    name: "Seed Faculty One",
    email: "seed.faculty1@campusos.local",
    employee_id: "SEEDFAC01",
    designation: "Assistant Professor",
    phone: "9876543210",
  },
  {
    name: "Seed Faculty Two",
    email: "seed.faculty2@campusos.local",
    employee_id: "SEEDFAC02",
    designation: "Associate Professor",
    phone: "9876543211",
  },
];

const STUDENTS = [
  {
    name: "Seed Student One",
    email: "seed.student1@campusos.local",
    roll_number: "SEEDSTU01",
    semester: 5,
    section: "A",
    admission_year: 2024,
    phone: "9876543220",
  },
  {
    name: "Seed Student Two",
    email: "seed.student2@campusos.local",
    roll_number: "SEEDSTU02",
    semester: 5,
    section: "A",
    admission_year: 2024,
    phone: "9876543221",
  },
  {
    name: "Seed Student Three",
    email: "seed.student3@campusos.local",
    roll_number: "SEEDSTU03",
    semester: 3,
    section: "B",
    admission_year: 2025,
    phone: "9876543222",
  },
];

const DOC_FILES = ["01_Product_Requirements_Document.md", "02_Market_and_Technical_Research.md"];

async function upsertUser({ name, email, role, password }) {
  const passwordHash = await hashPassword(password);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      isActive: true,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      name,
      email,
      role,
      passwordHash,
    },
  });
}

async function ensureDepartment() {
  return prisma.department.upsert({
    where: { dept_code: DEPARTMENT.dept_code },
    update: { dept_name: DEPARTMENT.dept_name },
    create: {
      dept_name: DEPARTMENT.dept_name,
      dept_code: DEPARTMENT.dept_code,
    },
  });
}

async function ensureFacultyProfile(user, facultyDef, deptId) {
  const existing = await prisma.faculty.findUnique({
    where: { user_id: user.user_id },
  });

  if (existing) {
    return prisma.faculty.update({
      where: { faculty_id: existing.faculty_id },
      data: {
        employee_id: facultyDef.employee_id,
        full_name: facultyDef.name,
        dept_id: deptId,
        designation: facultyDef.designation,
        phone: facultyDef.phone,
      },
    });
  }

  return prisma.faculty.create({
    data: {
      user_id: user.user_id,
      employee_id: facultyDef.employee_id,
      full_name: facultyDef.name,
      dept_id: deptId,
      designation: facultyDef.designation,
      phone: facultyDef.phone,
    },
  });
}

async function ensureStudentProfile(user, studentDef, deptId) {
  const existing = await prisma.student.findUnique({
    where: { user_id: user.user_id },
  });

  if (existing) {
    return prisma.student.update({
      where: { student_id: existing.student_id },
      data: {
        roll_number: studentDef.roll_number,
        full_name: studentDef.name,
        dept_id: deptId,
        semester: studentDef.semester,
        section: studentDef.section,
        admission_year: studentDef.admission_year,
        phone: studentDef.phone,
      },
    });
  }

  return prisma.student.create({
    data: {
      user_id: user.user_id,
      roll_number: studentDef.roll_number,
      full_name: studentDef.name,
      dept_id: deptId,
      semester: studentDef.semester,
      section: studentDef.section,
      admission_year: studentDef.admission_year,
      phone: studentDef.phone,
    },
  });
}

async function copyDocFiles() {
  await mkdir(FILES_DIR, { recursive: true });

  const copied = [];

  for (const filename of DOC_FILES) {
    const src = path.join(DOCS_DIR, filename);
    const dest = path.join(FILES_DIR, filename);
    await copyFile(src, dest);
    copied.push({
      name: filename,
      path: path.relative(ROOT, dest),
    });
    console.log(`Copied file: ${filename}`);
  }

  return copied;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const department = await ensureDepartment();
  console.log(`Department: ${department.dept_code} (id=${department.dept_id})`);

  const adminUser = await upsertUser({ ...ADMIN, password: PASSWORD });
  console.log(`Admin: ${adminUser.email} (user_id=${adminUser.user_id})`);

  const facultyRecords = [];
  for (const facultyDef of FACULTY) {
    const user = await upsertUser({
      name: facultyDef.name,
      email: facultyDef.email,
      role: "FACULTY",
      password: PASSWORD,
    });
    const profile = await ensureFacultyProfile(user, facultyDef, department.dept_id);
    facultyRecords.push({
      user_id: user.user_id,
      faculty_id: profile.faculty_id,
      email: user.email,
      password: PASSWORD,
      employee_id: profile.employee_id,
      full_name: profile.full_name,
    });
    console.log(`Faculty: ${user.email} (faculty_id=${profile.faculty_id})`);
  }

  const studentRecords = [];
  for (const studentDef of STUDENTS) {
    const user = await upsertUser({
      name: studentDef.name,
      email: studentDef.email,
      role: "STUDENT",
      password: PASSWORD,
    });
    const profile = await ensureStudentProfile(user, studentDef, department.dept_id);
    studentRecords.push({
      user_id: user.user_id,
      student_id: profile.student_id,
      email: user.email,
      password: PASSWORD,
      roll_number: profile.roll_number,
      full_name: profile.full_name,
      semester: profile.semester,
      section: profile.section,
    });
    console.log(`Student: ${user.email} (student_id=${profile.student_id})`);
  }

  const files = await copyDocFiles();

  const manifest = {
    createdAt: new Date().toISOString(),
    passwordNote: "All seeded users share the same password below.",
    department: {
      dept_id: department.dept_id,
      dept_name: department.dept_name,
      dept_code: department.dept_code,
    },
    admin: {
      user_id: adminUser.user_id,
      email: adminUser.email,
      password: PASSWORD,
      role: ADMIN.role,
    },
    faculty: facultyRecords,
    students: studentRecords,
    files,
  };

  const manifestPath = path.join(OUT_DIR, "users.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${path.relative(ROOT, manifestPath)}`);
  console.log(`Files dir: ${path.relative(ROOT, FILES_DIR)}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
