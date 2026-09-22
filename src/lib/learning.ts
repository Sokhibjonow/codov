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

/**
 * Lessons a student may open. In each course the first lesson is open; the next one opens once the
 * student has submitted every task of the previous one (a lesson without tasks counts once it is
 * marked as done). The teacher can also open the first N lessons for a group ahead of time.
 */
export async function getOpenLessonIds(userId: string, courseId?: string): Promise<Set<string>> {
  const courses = await prisma.course.findMany({
    where: { ...studentCourseWhere(userId), ...(courseId && { id: courseId }) },
    select: {
      groups: { where: { group: { members: { some: { userId } } } }, select: { openLessons: true } },
      modules: {
        orderBy: lessonOrder,
        select: {
          lessons: {
            where: { isPublished: true },
            orderBy: lessonOrder,
            select: { id: true, assignments: { where: { isPublished: true }, select: { id: true } } },
          },
        },
      },
    },
  });
  const lessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons));
  const [submitted, marked] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId: userId, assignmentId: { in: lessons.flatMap((l) => l.assignments.map((a) => a.id)) } },
      select: { assignmentId: true },
      distinct: ["assignmentId"],
    }),
    prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessons.map((l) => l.id) } }, select: { lessonId: true } }),
  ]);
  const hasSubmission = new Set(submitted.map((s) => s.assignmentId));
  const markedDone = new Set(marked.map((p) => p.lessonId));
  const finished = (lesson: (typeof lessons)[number]) =>
    lesson.assignments.length > 0 ? lesson.assignments.every((a) => hasSubmission.has(a.id)) : markedDone.has(lesson.id);

  const open = new Set<string>();
  for (const course of courses) {
    const ordered = course.modules.flatMap((m) => m.lessons);
    const openedByTeacher = Math.max(0, ...course.groups.map((g) => g.openLessons));
    let previousFinished = true;
    ordered.forEach((lesson, index) => {
      if (previousFinished || index < openedByTeacher) open.add(lesson.id);
      previousFinished = open.has(lesson.id) && finished(lesson);
    });
  }
  return open;
}

/** Published assignments the student can work on right now: only those of open lessons. */
export async function studentOpenAssignmentWhere(userId: string): Promise<Prisma.AssignmentWhereInput> {
  return { ...studentAssignmentWhere(userId), lessonId: { in: [...(await getOpenLessonIds(userId))] } };
}

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
  const open = await getOpenLessonIds(userId, courseId);

  return courses.map((course) => {
    const lessons = course.modules.flatMap((m) => m.lessons);
    return {
      ...course,
      lessons,
      completed,
      open,
      total: lessons.length,
      done: lessons.filter((l) => completed.has(l.id)).length,
      // The first open lesson not marked as done; a locked lesson is never offered
      nextLesson: lessons.find((l) => open.has(l.id) && !completed.has(l.id)) ?? null,
    };
  });
}

export type StudentCourse = Awaited<ReturnType<typeof getStudentCourses>>[number];
