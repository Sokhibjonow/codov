"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOpenLessonIds, studentCourseWhere } from "@/lib/learning";

export async function setLessonCompleted(lessonId: string, completed: boolean) {
  const user = await requireUser("STUDENT");

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, isPublished: true, module: { course: studentCourseWhere(user.id) } },
    select: { id: true },
  });
  if (!lesson || !(await getOpenLessonIds(user.id)).has(lesson.id)) return;

  if (completed) {
    await prisma.lessonProgress.createMany({ data: [{ userId: user.id, lessonId }], skipDuplicates: true });
  } else {
    await prisma.lessonProgress.deleteMany({ where: { userId: user.id, lessonId } });
  }

  revalidatePath("/student", "layout");
}
