-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('LECTURE_NOTES', 'PRESENTATIONS', 'LAB_MANUALS', 'REFERENCE_MATERIAL', 'PREVIOUS_YEAR_PAPERS');

-- CreateTable
CREATE TABLE "Notes" (
    "notes_id" SERIAL NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unit_number" INTEGER NOT NULL,
    "material_type" "MaterialType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notes_pkey" PRIMARY KEY ("notes_id")
);

-- CreateIndex
CREATE INDEX "Notes_subject_id_unit_number_idx" ON "Notes"("subject_id", "unit_number");

-- CreateIndex
CREATE INDEX "Notes_uploaded_by_idx" ON "Notes"("uploaded_by");

-- CreateIndex
CREATE INDEX "Notes_academic_year_idx" ON "Notes"("academic_year");

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notes" ADD CONSTRAINT "Notes_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "Faculty"("faculty_id") ON DELETE CASCADE ON UPDATE CASCADE;
