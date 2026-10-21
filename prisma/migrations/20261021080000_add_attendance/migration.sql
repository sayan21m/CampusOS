-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_SHORTAGE';

-- CreateTable
CREATE TABLE "Attendance" (
    "attendance_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "faculty_id" INTEGER NOT NULL,
    "timetable_id" INTEGER NOT NULL,
    "class_date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateIndex
CREATE INDEX "Attendance_subject_id_class_date_idx" ON "Attendance"("subject_id", "class_date");

-- CreateIndex
CREATE INDEX "Attendance_faculty_id_class_date_idx" ON "Attendance"("faculty_id", "class_date");

-- CreateIndex
CREATE INDEX "Attendance_student_id_subject_id_idx" ON "Attendance"("student_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_student_id_timetable_id_class_date_key" ON "Attendance"("student_id", "timetable_id", "class_date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "TimetableSlot"("timetable_id") ON DELETE CASCADE ON UPDATE CASCADE;
