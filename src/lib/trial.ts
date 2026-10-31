import { prisma } from "./db";

/**
 * Courses a visitor can try for free on /register: every published course linked to an active trial
 * group, each with the newest such group (the one a sign-up for that course joins).
 */
export async function getTrialCourses() {
  const groups = await prisma.group.findMany({
    where: { isTrial: true, isArchived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      trialLessons: true,
      courses: {
        where: { course: { isPublished: true } },
        select: { course: { select: { id: true, titleUz: true, titleRu: true, descriptionUz: true, descriptionRu: true, order: true } } },
      },
    },
  });
  const byCourse = new Map<string, { groupId: string; freeLessons: number; course: (typeof groups)[number]["courses"][number]["course"] }>();
  for (const group of groups) {
    for (const { course } of group.courses) {
      if (!byCourse.has(course.id)) byCourse.set(course.id, { groupId: group.id, freeLessons: group.trialLessons, course });
    }
  }
  return [...byCourse.values()]
    .sort((a, b) => a.course.order - b.course.order)
    .map(({ groupId, freeLessons, course }) => ({ ...course, groupId, freeLessons }));
}

export type TrialCourse = Awaited<ReturnType<typeof getTrialCourses>>[number];
