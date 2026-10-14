-- CreateEnum
CREATE TYPE "TimetableExceptionType" AS ENUM ('ROOM_TIME_CHANGE', 'FACULTY_SUBSTITUTION', 'CANCELLED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "timetable_id" SERIAL NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "faculty_id" INTEGER NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "room" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("timetable_id")
);

-- CreateTable
CREATE TABLE "TimetableException" (
    "timetable_exception_id" SERIAL NOT NULL,
    "timetable_id" INTEGER NOT NULL,
    "exception_type" "TimetableExceptionType" NOT NULL,
    "original_date" DATE NOT NULL,
    "rescheduled_date" DATE,
    "replacement_faculty_id" INTEGER,
    "period" INTEGER,
    "room" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableException_pkey" PRIMARY KEY ("timetable_exception_id")
);

-- CreateIndex
CREATE INDEX "TimetableSlot_faculty_id_day_of_week_idx" ON "TimetableSlot"("faculty_id", "day_of_week");

-- CreateIndex
CREATE INDEX "TimetableSlot_dept_id_semester_section_idx" ON "TimetableSlot"("dept_id", "semester", "section");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_dept_id_semester_section_day_of_week_period_key" ON "TimetableSlot"("dept_id", "semester", "section", "day_of_week", "period");

-- CreateIndex
CREATE INDEX "TimetableException_original_date_idx" ON "TimetableException"("original_date");

-- CreateIndex
CREATE INDEX "TimetableException_rescheduled_date_idx" ON "TimetableException"("rescheduled_date");

-- CreateIndex
CREATE INDEX "TimetableException_replacement_faculty_id_rescheduled_date_idx" ON "TimetableException"("replacement_faculty_id", "rescheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableException_timetable_id_original_date_key" ON "TimetableException"("timetable_id", "original_date");

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "Department"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableException" ADD CONSTRAINT "TimetableException_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "TimetableSlot"("timetable_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableException" ADD CONSTRAINT "TimetableException_replacement_faculty_id_fkey" FOREIGN KEY ("replacement_faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE;
