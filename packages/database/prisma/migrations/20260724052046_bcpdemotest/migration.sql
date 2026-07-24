/*
  Warnings:

  - The values [sms] on the enum `NotificationChannel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actor_type` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `content_type` on the `brand_voice_examples` table. All the data in the column will be lost.
  - You are about to drop the column `row_number` on the `import_job_errors` table. All the data in the column will be lost.
  - You are about to drop the column `actor_type` on the `login_history` table. All the data in the column will be lost.
  - You are about to drop the column `content_type` on the `marketing_content_requests` table. All the data in the column will be lost.
  - You are about to drop the column `step_data` on the `onboarding_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `blur_score` on the `photo_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `actor_type` on the `recovery_codes` table. All the data in the column will be lost.
  - You are about to drop the column `report_type` on the `saved_reports` table. All the data in the column will be lost.
  - You are about to drop the column `actor_type` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `actor_type` on the `verification_tokens` table. All the data in the column will be lost.
  - Added the required column `actorType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentType` to the `brand_voice_examples` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rowNumber` to the `import_job_errors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorType` to the `login_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentType` to the `marketing_content_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blurScore` to the `photo_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorType` to the `recovery_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportType` to the `saved_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorType` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorType` to the `verification_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationChannel_new" AS ENUM ('in_app', 'email', 'whatsapp', 'browser_push', 'pwa_push');
ALTER TABLE "notifications" ALTER COLUMN "channel" TYPE "NotificationChannel_new" USING ("channel"::text::"NotificationChannel_new");
ALTER TYPE "NotificationChannel" RENAME TO "NotificationChannel_old";
ALTER TYPE "NotificationChannel_new" RENAME TO "NotificationChannel";
DROP TYPE "NotificationChannel_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "gallery_download_logs" DROP CONSTRAINT "gallery_download_logs_photo_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_actor_type_actor_id_idx";

-- DropIndex
DROP INDEX "brand_voice_examples_studio_id_content_type_idx";

-- DropIndex
DROP INDEX "login_history_actor_type_actor_id_idx";

-- DropIndex
DROP INDEX "marketing_content_requests_studio_id_content_type_idx";

-- DropIndex
DROP INDEX "recovery_codes_actor_type_actor_id_idx";

-- DropIndex
DROP INDEX "saved_reports_studio_id_report_type_idx";

-- DropIndex
DROP INDEX "sessions_actor_type_actor_id_idx";

-- DropIndex
DROP INDEX "verification_tokens_actor_type_actor_id_purpose_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "ActorType" NOT NULL;

-- AlterTable
ALTER TABLE "brand_voice_examples" DROP COLUMN "content_type",
ADD COLUMN     "contentType" "MarketingContentType" NOT NULL;

-- AlterTable
ALTER TABLE "import_job_errors" DROP COLUMN "row_number",
ADD COLUMN     "rowNumber" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "license_keys" ALTER COLUMN "allowed_domains" DROP DEFAULT;

-- AlterTable
ALTER TABLE "login_history" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "ActorType" NOT NULL;

-- AlterTable
ALTER TABLE "marketing_content_requests" DROP COLUMN "content_type",
ADD COLUMN     "contentType" "MarketingContentType" NOT NULL;

-- AlterTable
ALTER TABLE "onboarding_sessions" DROP COLUMN "step_data",
ADD COLUMN     "stepData" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "completed_steps" DROP DEFAULT,
ALTER COLUMN "skipped_steps" DROP DEFAULT;

-- AlterTable
ALTER TABLE "photo_analyses" DROP COLUMN "blur_score",
ADD COLUMN     "blurScore" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "recovery_codes" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "ActorType" NOT NULL;

-- AlterTable
ALTER TABLE "saved_reports" DROP COLUMN "report_type",
ADD COLUMN     "reportType" "ReportType" NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "ActorType" NOT NULL;

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "ActorType" NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_actorType_actor_id_idx" ON "audit_logs"("actorType", "actor_id");

-- CreateIndex
CREATE INDEX "brand_voice_examples_studio_id_contentType_idx" ON "brand_voice_examples"("studio_id", "contentType");

-- CreateIndex
CREATE INDEX "login_history_actorType_actor_id_idx" ON "login_history"("actorType", "actor_id");

-- CreateIndex
CREATE INDEX "marketing_content_requests_studio_id_contentType_idx" ON "marketing_content_requests"("studio_id", "contentType");

-- CreateIndex
CREATE INDEX "recovery_codes_actorType_actor_id_idx" ON "recovery_codes"("actorType", "actor_id");

-- CreateIndex
CREATE INDEX "saved_reports_studio_id_reportType_idx" ON "saved_reports"("studio_id", "reportType");

-- CreateIndex
CREATE INDEX "sessions_actorType_actor_id_idx" ON "sessions"("actorType", "actor_id");

-- CreateIndex
CREATE INDEX "verification_tokens_actorType_actor_id_purpose_idx" ON "verification_tokens"("actorType", "actor_id", "purpose");

-- AddForeignKey
ALTER TABLE "gallery_download_logs" ADD CONSTRAINT "gallery_download_logs_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "album_suggestion_photos_album_suggestion_id_gallery_photo__key" RENAME TO "album_suggestion_photos_album_suggestion_id_gallery_photo_i_key";

-- RenameIndex
ALTER INDEX "culling_recommendations_culling_session_id_gallery_photo__key" RENAME TO "culling_recommendations_culling_session_id_gallery_photo_id_key";

-- RenameIndex
ALTER INDEX "duplicate_group_members_duplicate_group_id_gallery_photo__key" RENAME TO "duplicate_group_members_duplicate_group_id_gallery_photo_id_key";

-- RenameIndex
ALTER INDEX "face_search_matches_face_search_session_id_gallery_photo__key" RENAME TO "face_search_matches_face_search_session_id_gallery_photo_id_key";
