-- AlterTable
ALTER TABLE "CodeDraft" ADD COLUMN     "replay" JSONB;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false;
