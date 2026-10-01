-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "solutionCss" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "solutionHtml" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "solutionJs" TEXT NOT NULL DEFAULT '';
