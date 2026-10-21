-- AlterTable
ALTER TABLE "User" ADD COLUMN "photo_url" TEXT;

-- CreateTable
CREATE TABLE "NoticeRead" (
    "notice_read_id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("notice_read_id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "preference_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "activity_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("activity_id")
);

-- CreateIndex
CREATE INDEX "NoticeRead_user_id_idx" ON "NoticeRead"("user_id");

-- CreateIndex
CREATE INDEX "NoticeRead_notice_id_idx" ON "NoticeRead"("notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeRead_notice_id_user_id_key" ON "NoticeRead"("notice_id", "user_id");

-- CreateIndex
CREATE INDEX "NotificationPreference_user_id_idx" ON "NotificationPreference"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_user_id_category_key" ON "NotificationPreference"("user_id", "category");

-- CreateIndex
CREATE INDEX "ActivityLog_user_id_created_at_idx" ON "ActivityLog"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "Notice"("notice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
