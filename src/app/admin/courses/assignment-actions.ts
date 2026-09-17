"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyAssignmentPublished } from "@/lib/notifications";
import type { Prisma } from "@/generated/prisma/client";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { firstInvalidRule, parseRules } from "@/lib/autotests";
import { fail, formText, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fromTashkentInput } from "@/lib/format";

const MAX_TITLE = 120;
const MAX_TEXT = 100_000;

function refresh() {
  revalidatePath("/", "layout");
}

/** Raw (untrimmed) form value: indentation in code and Markdown matters. */
function rawText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, MAX_TEXT) : "";
}

function editorPath(assignment: { id: string; lessonId: string; lesson: { module: { courseId: string } } }) {
  return `/admin/courses/${assignment.lesson.module.courseId}/lessons/${assignment.lessonId}/assignments/${assignment.id}`;
}

export async function createAssignment(lessonId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const titleUz = formText(formData, "titleUz").slice(0, MAX_TITLE);
  const titleRu = formText(formData, "titleRu").slice(0, MAX_TITLE);
  if (!titleUz && !titleRu) return fail(t.courses.titleRequired);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return fail(t.common.errors.notFound);

  const last = await prisma.assignment.aggregate({ where: { lessonId }, _max: { order: true } });
  const assignment = await prisma.assignment.create({
    data: { lessonId, titleUz, titleRu, order: (last._max.order ?? -1) + 1 },
    select: { id: true, lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } },
  });

  refresh();
  redirect(editorPath(assignment));
}

export async function updateAssignment(assignmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const titleUz = formText(formData, "titleUz").slice(0, MAX_TITLE);
  const titleRu = formText(formData, "titleRu").slice(0, MAX_TITLE);
  if (!titleUz && !titleRu) return fail(t.courses.titleRequired);

  const maxScore = Number.parseInt(formText(formData, "maxScore"), 10);

  let rawTests: unknown;
  try {
    rawTests = JSON.parse(formText(formData, "tests") || "[]");
  } catch {
    rawTests = null;
  }
  const invalidRule = firstInvalidRule(rawTests);
  if (invalidRule !== null) return fail(format(t.autotests.invalidRule, { n: invalidRule }));

  const { count } = await prisma.assignment.updateMany({
    where: { id: assignmentId },
    data: {
      titleUz,
      titleRu,
      descriptionUz: rawText(formData, "descriptionUz"),
      descriptionRu: rawText(formData, "descriptionRu"),
      topic: formText(formData, "topic").slice(0, 200),
      starterHtml: rawText(formData, "starterHtml"),
      starterCss: rawText(formData, "starterCss"),
      starterJs: rawText(formData, "starterJs"),
      maxScore: Number.isFinite(maxScore) ? Math.min(Math.max(maxScore, 1), 1000) : 100,
      aiReviewEnabled: formData.get("aiReviewEnabled") === "on",
      tests: parseRules(rawTests) as unknown as Prisma.InputJsonValue,
    },
  });
  if (count === 0) return fail(t.common.errors.notFound);

  refresh();
  return { ok: true, message: t.common.saved };
}

export async function setAssignmentPublished(assignmentId: string, isPublished: boolean) {
  await requireUser("ADMIN");
  await prisma.assignment.updateMany({ where: { id: assignmentId }, data: { isPublished } });
  refresh();
  if (isPublished) after(() => notifyAssignmentPublished(assignmentId));
}

export async function deleteAssignment(assignmentId: string) {
  await requireUser("ADMIN");
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } },
  });
  if (!assignment) redirect("/admin/courses");

  await prisma.assignment.delete({ where: { id: assignmentId } });
  refresh();
  redirect(`/admin/courses/${assignment.lesson.module.courseId}/lessons/${assignment.lessonId}`);
}

export async function setAssignmentDeadlines(assignmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { lesson: { select: { module: { select: { course: { select: { groups: { select: { groupId: true } } } } } } } } },
  });
  if (!assignment) return fail(t.common.errors.notFound);

  const groupIds = assignment.lesson.module.course.groups.map((g) => g.groupId);
  const writes = groupIds.map((groupId) => {
    const dueAt = fromTashkentInput(formText(formData, `deadline_${groupId}`));
    const where = { assignmentId_groupId: { assignmentId, groupId } };
    return dueAt
      ? prisma.assignmentDeadline.upsert({ where, create: { assignmentId, groupId, dueAt }, update: { dueAt } })
      : prisma.assignmentDeadline.deleteMany({ where: { assignmentId, groupId } });
  });
  await prisma.$transaction(writes);

  refresh();
  return { ok: true, message: t.common.saved };
}
