-- CreateTable
CREATE TABLE "Notice" (
    "notice_id" SERIAL NOT NULL,
    "created_by" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_value" TEXT NOT NULL,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("notice_id")
);

-- CreateIndex
CREATE INDEX "Notice_created_by_idx" ON "Notice"("created_by");

-- CreateIndex
CREATE INDEX "Notice_target_type_target_value_idx" ON "Notice"("target_type", "target_value");

-- CreateIndex
CREATE INDEX "Notice_created_at_idx" ON "Notice"("created_at");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
