-- CreateTable
CREATE TABLE "Subject" (
    "subject_id" SERIAL NOT NULL,
    "subject_code" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("subject_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_subject_code_key" ON "Subject"("subject_code");

-- CreateIndex
CREATE INDEX "Subject_dept_id_idx" ON "Subject"("dept_id");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "Department"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;
