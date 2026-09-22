-- Lessons open in order; the teacher can open the first N lessons of a course for a group ahead of time
ALTER TABLE "GroupCourse" ADD COLUMN "openLessons" INTEGER NOT NULL DEFAULT 0;
