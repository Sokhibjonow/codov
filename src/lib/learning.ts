import type { Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "./db";

export { pick } from "./learning-text";

/** Published courses opened for at least one of the student's groups. */
export function studentCourseWhere(userId: string): Prisma.CourseWhereInput {
  return {
    isPublished: true,
    groups: { some: { group: { members: { some: { userId } } } } },
  };
}

/** Published assignments of published lessons in the student's courses. */
export function studentAssignmentWhere(userId: string): Prisma.AssignmentWhereInput {
  return {
    isPublished: true,
    lesson: { isPublished: true, module: { course: studentCourseWhere(userId) } },
  };
}

export type AssignmentProgress = "NOT_STARTED" | "IN_PROGRESS" | SubmissionStatus;

export function assignmentProgress(assignment: {
  drafts: unknown[];
  submissions: { status: SubmissionStatus }[];
}): AssignmentProgress {
  return assignment.submissions[0]?.status ?? (assignment.drafts.length > 0 ? "IN_PROGRESS" : "NOT_STARTED");
}

const lessonOrder =[{ order: "asc" as const }, { createdAt: "asc" as const }];

/** Courses available to a student with their published lessons in order and the progress. */
export async function getStudentCourses(userId: string, courseId?: string) {
  const courses = await prisma.course.findMany({
    where: { ...studentCourseWhere(userId), ...(courseId && { id: courseId }) },
    orderBy: lessonOrder,
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      modules: {
        orderBy: lessonOrder,
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          lessons: {
            where: { isPublished: true },
            orderBy: lessonOrder,
            select: { id: true, titleUz: true, titleRu: true },
          },
        },
      },
    },
  });

  const lessonIds = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });
  const completed = new Set(progress.map((p) => p.lessonId));

  return courses.map((course) => {
    const lessons = course.modules.flatMap((m) => m.lessons);
    return {
      ...course,
      lessons,
      completed,
      total: lessons.length,
      done: lessons.filter((l) => completed.has(l.id)).length,
      nextLesson: lessons.find((l) => !completed.has(l.id)) ?? null,
    };
  });
}

export type StudentCourse = Awaited<ReturnType<typeof getStudentCourses>>[number];
