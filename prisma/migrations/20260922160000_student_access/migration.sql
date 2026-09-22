
-- CreateTable
CREATE TABLE "StudentLessonAccess" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLessonAccess_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "StudentAssignmentAccess" (
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAssignmentAccess_pkey" PRIMARY KEY ("userId","assignmentId")
);

-- CreateIndex
CREATE INDEX "StudentLessonAccess_lessonId_idx" ON "StudentLessonAccess"("lessonId");

-- CreateIndex
CREATE INDEX "StudentAssignmentAccess_assignmentId_idx" ON "StudentAssignmentAccess"("assignmentId");

-- AddForeignKey
ALTER TABLE "StudentLessonAccess" ADD CONSTRAINT "StudentLessonAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLessonAccess" ADD CONSTRAINT "StudentLessonAccess_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssignmentAccess" ADD CONSTRAINT "StudentAssignmentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssignmentAccess" ADD CONSTRAINT "StudentAssignmentAccess_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

