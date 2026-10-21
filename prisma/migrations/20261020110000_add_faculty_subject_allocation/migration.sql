-- CreateTable
CREATE TABLE "FacultySubjectAllocation" (
    "allocation_id" SERIAL NOT NULL,
    "faculty_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultySubjectAllocation_pkey" PRIMARY KEY ("allocation_id")
);

-- CreateIndex
CREATE INDEX "FacultySubjectAllocation_subject_id_idx" ON "FacultySubjectAllocation"("subject_id");

-- CreateIndex
CREATE INDEX "FacultySubjectAllocation_faculty_id_idx" ON "FacultySubjectAllocation"("faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "FacultySubjectAllocation_faculty_id_subject_id_key" ON "FacultySubjectAllocation"("faculty_id", "subject_id");

-- AddForeignKey
ALTER TABLE "FacultySubjectAllocation" ADD CONSTRAINT "FacultySubjectAllocation_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultySubjectAllocation" ADD CONSTRAINT "FacultySubjectAllocation_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;
