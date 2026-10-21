-- CreateTable
CREATE TABLE "Department" (
    "dept_id" SERIAL NOT NULL,
    "dept_name" TEXT NOT NULL,
    "dept_code" TEXT NOT NULL,
    "hod_faculty_id" INTEGER,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("dept_id")
);

-- CreateTable
CREATE TABLE "Student" (
    "student_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "roll_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "phone" TEXT,
    "photo_url" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "faculty_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "phone" TEXT,
    "photo_url" TEXT,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("faculty_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_dept_name_key" ON "Department"("dept_name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_dept_code_key" ON "Department"("dept_code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_hod_faculty_id_key" ON "Department"("hod_faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "Student_user_id_key" ON "Student"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Student_roll_number_key" ON "Student"("roll_number");

-- CreateIndex
CREATE INDEX "Student_dept_id_idx" ON "Student"("dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_user_id_key" ON "Faculty"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_employee_id_key" ON "Faculty"("employee_id");

-- CreateIndex
CREATE INDEX "Faculty_dept_id_idx" ON "Faculty"("dept_id");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hod_faculty_id_fkey" FOREIGN KEY ("hod_faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "Department"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "Department"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;
