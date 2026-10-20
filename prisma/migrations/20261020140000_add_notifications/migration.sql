-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'ASSIGNMENT_PUBLISHED',
  'ASSIGNMENT_DEADLINE_48H',
  'ASSIGNMENT_DEADLINE_12H',
  'ASSIGNMENT_GRADED',
  'NOTICE_PUBLISHED',
  'NOTES_UPLOADED'
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "reference_id" INTEGER,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_idx" ON "Notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_type_reference_id_idx" ON "Notification"("type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_user_id_type_reference_id_key" ON "Notification"("user_id", "type", "reference_id");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
