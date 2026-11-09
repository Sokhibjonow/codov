-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('CODE', 'TEXT');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "criteria" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" "AssignmentKind" NOT NULL DEFAULT 'CODE',
ADD COLUMN     "templateRu" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "templateUz" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CodeDraft" ADD COLUMN     "answer" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "answer" TEXT NOT NULL DEFAULT '';
