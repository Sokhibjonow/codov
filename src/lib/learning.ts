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

type CourseGroupLink = { openLessons: number; group: { isTrial: boolean; trialLessons: number } };

/**
 * How a course opens for one student, from the groups that link them to it. A student who reaches
 * the course only through trial groups gets the free first lessons, each opening once the previous
 * one is submitted; a real group lifts both limits.
 */
export function courseAccess(links: CourseGroupLink[]) {
  const trialOnly = links.length > 0 && links.every((l) => l.group.isTrial);
  return {
    trialOnly,
    /** Lessons with an index at or past this stay closed (Infinity = no limit) */
    limit: trialOnly ? Math.max(...links.map((l) => l.group.trialLessons)) : Infinity,
    openedByTeacher: Math.max(0, ...links.filter((l) => !l.group.isTrial).map((l) => l.openLessons)),
  };
}
const linkSelect = (userId: string) =>
  ({ where: { group: { members: { some: { userId } } } }, select: { openLessons: true, group: { select: { isTrial: true, trialLessons: true } } } }) as const;

/**
 * Lessons a student may open. In each course the first lesson is open; the next one opens once the
 * teacher has accepted every task of the previous one (a lesson without tasks counts once it is
 * marked as done). The teacher can also open the first N lessons for a group ahead of time, or open
 * single lessons for one student. Trial students: see courseAccess.
 */
export async function getOpenLessonIds(userId: string, courseId?: string): Promise<Set<string>> {
  const courses = await prisma.course.findMany({
    where: { ...studentCourseWhere(userId), ...(courseId && { id: courseId }) },
    select: {
      groups: linkSelect(userId),
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
  const [submissions, marked, granted] = await Promise.all([
    // Only work the teacher accepted counts: a submitted or returned task keeps the next lesson closed
    // (trial students: any submission that wasn't returned)
    prisma.submission.findMany({
      where: { studentId: userId, status: { not: "RETURNED" }, assignmentId: { in: lessons.flatMap((l) => l.assignments.map((a) => a.id)) } },
      select: { assignmentId: true, status: true },
    }),
    prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessons.map((l) => l.id) } }, select: { lessonId: true } }),
    prisma.studentLessonAccess.findMany({ where: { userId }, select: { lessonId: true } }),
  ]);
  const openedForStudent = new Set(granted.map((g) => g.lessonId));
  const isAccepted = new Set(submissions.filter((s) => s.status === "ACCEPTED").map((s) => s.assignmentId));
  const isSubmitted = new Set(submissions.map((s) => s.assignmentId));
  const markedDone = new Set(marked.map((p) => p.lessonId));

  const open = new Set<string>();
  for (const course of courses) {
    const ordered = course.modules.flatMap((m) => m.lessons);
    const { trialOnly, limit, openedByTeacher } = courseAccess(course.groups);
    const done = trialOnly ? isSubmitted : isAccepted;
    const finished = (lesson: (typeof lessons)[number]) =>
      lesson.assignments.length > 0 ? lesson.assignments.every((a) => done.has(a.id)) : markedDone.has(lesson.id);
    let previousFinished = true;
    ordered.forEach((lesson, index) => {
      const inOrder = (previousFinished || index < openedByTeacher) && index < limit;
      if (inOrder || openedForStudent.has(lesson.id)) open.add(lesson.id);
      previousFinished = open.has(lesson.id) && finished(lesson);
    });
  }
  return open;
}

/** Published assignments the student can work on right now: tasks of open lessons and tasks the teacher opened for them. */
export async function studentOpenAssignmentWhere(userId: string): Promise<Prisma.AssignmentWhereInput> {
  return {
    ...studentAssignmentWhere(userId),
    OR: [{ lessonId: { in: [...(await getOpenLessonIds(userId))] } }, { access: { some: { userId } } }],
  };
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
      groups: linkSelect(userId),
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

  return courses.map(({ groups, ...course }) => {
    const lessons = course.modules.flatMap((m) => m.lessons);
    const access = courseAccess(groups);
    return {
      ...course,
      /** Trial students: lessons from this index on open only in a real group */
      trialLimit: access.trialOnly ? access.limit : null,
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

/** A student who is only in trial groups: their free-lesson count and the offer to join a real group. */
export async function getTrialOffer(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { isArchived: false } },
    select: { group: { select: { isTrial: true, trialLessons: true, offerStart: true, offerSeats: true, offerLink: true } } },
  });
  if (memberships.length === 0 || !memberships.every((m) => m.group.isTrial)) return null;
  const g = memberships[0].group;
  return { freeLessons: g.trialLessons, start: g.offerStart, seats: g.offerSeats, link: g.offerLink || "https://t.me/codov_admin" };
}
