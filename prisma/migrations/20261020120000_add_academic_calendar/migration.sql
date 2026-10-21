-- CreateEnum
CREATE TYPE "CalendarEntryType" AS ENUM (
  'HOLIDAY',
  'EXAMINATION',
  'ASSIGNMENT_DEADLINE',
  'EVENT',
  'LAST_WORKING_DAY'
);

-- CreateTable
CREATE TABLE "AcademicCalendar" (
    "calendar_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entry_type" "CalendarEntryType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCalendar_pkey" PRIMARY KEY ("calendar_id")
);

-- CreateIndex
CREATE INDEX "AcademicCalendar_academic_year_idx" ON "AcademicCalendar"("academic_year");

-- CreateIndex
CREATE INDEX "AcademicCalendar_entry_type_idx" ON "AcademicCalendar"("entry_type");

-- CreateIndex
CREATE INDEX "AcademicCalendar_start_date_end_date_idx" ON "AcademicCalendar"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "AcademicCalendar_created_by_idx" ON "AcademicCalendar"("created_by");

-- AddForeignKey
ALTER TABLE "AcademicCalendar" ADD CONSTRAINT "AcademicCalendar_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
