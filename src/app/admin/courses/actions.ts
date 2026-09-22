"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary } from "@/i18n/server";
import { fail, formList, formText, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 1000;
const MAX_CONTENT = 100_000;
const byOrder = [{ order: "asc" as const }, { createdAt: "asc" as const }];

function texts(formData: FormData, key: string, max: number) {
  return {
    uz: formText(formData, `${key}Uz`).slice(0, max),
    ru: formText(formData, `${key}Ru`).slice(0, max),
  };
}

// Course changes are visible to students too, so refresh every page
function refresh() {
  revalidatePath("/", "layout");
}

/** Moves `id` one step up (-1) or down (1) and renumbers the siblings 0..n. */
async function reorder(ids: string[], id: string, direction: number, save: (id: string, order: number) => Prisma.PrismaPromise<unknown>) {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;

  [ids[index], ids[target]] = [ids[target], ids[index]];
  await prisma.$transaction(ids.map((itemId, order) => save(itemId, order)));
}

// ───────────── Courses ─────────────

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);
  const description = texts(formData, "description", MAX_DESCRIPTION);

  const last = await prisma.course.aggregate({ _max: { order: true } });
  const course = await prisma.course.create({
    data: {
      titleUz: title.uz,
      titleRu: title.ru,
      descriptionUz: description.uz,
      descriptionRu: description.ru,
      order: (last._max.order ?? -1) + 1,
    },
  });

  refresh();
  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourse(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);
  const description = texts(formData, "description", MAX_DESCRIPTION);

  const { count } = await prisma.course.updateMany({
    where: { id: courseId },
    data: { titleUz: title.uz, titleRu: title.ru, descriptionUz: description.uz, descriptionRu: description.ru },
  });
  if (count === 0) return fail(t.common.errors.notFound);

  refresh();
  return { ok: true, message: t.common.saved };
}

export async function setCoursePublished(courseId: string, isPublished: boolean) {
  await requireUser("ADMIN");
  await prisma.course.updateMany({ where: { id: courseId }, data: { isPublished } });
  refresh();
}

export async function setCourseGroups(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return fail(t.common.errors.notFound);

  const groupIds = formList(formData, "groupIds");
  await prisma.$transaction([
    prisma.groupCourse.deleteMany({ where: { courseId, groupId: { notIn: groupIds } } }),
    prisma.groupCourse.createMany({ data: groupIds.map((groupId) => ({ groupId, courseId })), skipDuplicates: true }),
  ]);

  refresh();
  return { ok: true, message: t.common.saved };
}

/** How many first lessons each linked group gets open regardless of progress (0 = strictly in order). */
export async function setCourseOpenLessons(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const links = await prisma.groupCourse.findMany({ where: { courseId }, select: { groupId: true } });
  if (links.length === 0) return fail(t.common.errors.notFound);

  await prisma.$transaction(
    links.map(({ groupId }) => {
      const value = Number(formText(formData, `open-${groupId}`));
      const openLessons = Number.isInteger(value) ? Math.min(Math.max(value, 0), 1000) : 0;
      return prisma.groupCourse.update({ where: { groupId_courseId: { groupId, courseId } }, data: { openLessons } });
    }),
  );

  refresh();
  return { ok: true, message: t.common.saved };
}

export async function deleteCourse(courseId: string) {
  await requireUser("ADMIN");
  await prisma.course.deleteMany({ where: { id: courseId } });
  refresh();
  redirect("/admin/courses");
}

// ───────────── Modules ─────────────

export async function createModule(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return fail(t.common.errors.notFound);

  const last = await prisma.module.aggregate({ where: { courseId }, _max: { order: true } });
  await prisma.module.create({
    data: { courseId, titleUz: title.uz, titleRu: title.ru, order: (last._max.order ?? -1) + 1 },
  });

  refresh();
  return { ok: true };
}

export async function updateModule(moduleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);

  await prisma.module.updateMany({ where: { id: moduleId }, data: { titleUz: title.uz, titleRu: title.ru } });
  refresh();
  return { ok: true };
}

export async function deleteModule(moduleId: string) {
  await requireUser("ADMIN");
  await prisma.module.deleteMany({ where: { id: moduleId } });
  refresh();
}

export async function moveModule(moduleId: string, direction: number) {
  await requireUser("ADMIN");
  const current = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!current) return;

  const siblings = await prisma.module.findMany({ where: { courseId: current.courseId }, orderBy: byOrder, select: { id: true } });
  await reorder(siblings.map((s) => s.id), moduleId, direction, (id, order) =>
    prisma.module.update({ where: { id }, data: { order } }),
  );
  refresh();
}

// ───────────── Lessons ─────────────

export async function createLesson(moduleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);

  const moduleRow = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!moduleRow) return fail(t.common.errors.notFound);

  const last = await prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
  const lesson = await prisma.lesson.create({
    data: { moduleId, titleUz: title.uz, titleRu: title.ru, order: (last._max.order ?? -1) + 1 },
  });

  refresh();
  redirect(`/admin/courses/${moduleRow.courseId}/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const title = texts(formData, "title", MAX_TITLE);
  if (!title.uz && !title.ru) return fail(t.courses.titleRequired);

  // Content is not trimmed with formText: leading indentation in code blocks matters
  const content = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.slice(0, MAX_CONTENT) : "";
  };

  const { count } = await prisma.lesson.updateMany({
    where: { id: lessonId },
    data: { titleUz: title.uz, titleRu: title.ru, contentUz: content("contentUz"), contentRu: content("contentRu") },
  });
  if (count === 0) return fail(t.common.errors.notFound);

  refresh();
  return { ok: true, message: t.common.saved };
}

export async function setLessonPublished(lessonId: string, isPublished: boolean) {
  await requireUser("ADMIN");
  await prisma.lesson.updateMany({ where: { id: lessonId }, data: { isPublished } });
  refresh();
}

export async function deleteLesson(lessonId: string) {
  await requireUser("ADMIN");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
  if (!lesson) redirect("/admin/courses");

  await prisma.lesson.delete({ where: { id: lessonId } });
  refresh();
  redirect(`/admin/courses/${lesson.module.courseId}`);
}

export async function moveLesson(lessonId: string, direction: number) {
  await requireUser("ADMIN");
  const current = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } });
  if (!current) return;

  const siblings = await prisma.lesson.findMany({ where: { moduleId: current.moduleId }, orderBy: byOrder, select: { id: true } });
  await reorder(siblings.map((s) => s.id), lessonId, direction, (id, order) =>
    prisma.lesson.update({ where: { id }, data: { order } }),
  );
  refresh();
}
