
-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "key" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_lessonId_key_key" ON "Assignment"("lessonId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_slug_key" ON "Lesson"("moduleId", "slug");

