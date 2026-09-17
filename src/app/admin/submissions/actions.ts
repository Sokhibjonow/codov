"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { kickAiQueue } from "@/lib/ai/queue";
import { autotestScore, parseResults, parseRules } from "@/lib/autotests";
import { notify } from "@/lib/notifications";
import { fullName } from "@/lib/users";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { fail, formText, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Results of the autotests re-run in the teacher's browser (trusted, unlike the student's run). */
export async function saveAutotestResults(submissionId: string, results: unknown) {
  await requireUser("ADMIN");
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { assignment: { select: { tests: true } } },
  });
  if (!submission) return;

  const rules = parseRules(submission.assignment.tests);
  if (rules.length === 0) return;
  const parsed = parseResults(results, rules);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { autotestResults: parsed as unknown as Prisma.InputJsonValue, autotestScore: autotestScore(rules, parsed) },
  });
  revalidatePath("/admin/submissions");
}

export async function requeueAiReview(submissionId: string) {
  await requireUser("ADMIN");
  await prisma.submission.updateMany({
    where: { id: submissionId, aiStatus: { not: "RUNNING" } },
    data: { aiStatus: "QUEUED", aiError: null, aiAttempts: 0 },
  });
  revalidatePath("/admin/submissions", "layout");
  after(() => kickAiQueue());
}

export async function reviewSubmission(submissionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const { t } = await getDictionary();

  const decision = formText(formData, "decision");
  if (decision !== "ACCEPTED" && decision !== "RETURNED") return fail(t.common.errors.generic);

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      studentId: true,
      student: { select: { firstName: true, lastName: true, parents: { select: { parentId: true } } } },
      assignment: { select: { id: true, maxScore: true, titleUz: true, titleRu: true } },
    },
  });
  if (!submission) return fail(t.common.errors.notFound);

  const maxScore = submission.assignment.maxScore;
  const rawScore = formText(formData, "score");
  const score = rawScore === "" ? null : Number(rawScore);
  const scoreError = format(t.submissions.scoreRequired, { max: maxScore });
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > maxScore)) return fail(scoreError);
  if (decision === "ACCEPTED" && score === null) return fail(scoreError);

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: decision,
      score,
      teacherComment: formText(formData, "comment").slice(0, 5000) || null,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
  });

  const reviewed = {
    submissionId,
    assignmentId: submission.assignment.id,
    status: decision,
    score,
    maxScore,
    titleUz: submission.assignment.titleUz,
    titleRu: submission.assignment.titleRu,
  } as const;
  await notify([submission.studentId], "submission.reviewed", reviewed);
  await notify(
    submission.student.parents.map((p) => p.parentId),
    "submission.reviewed",
    { ...reviewed, childId: submission.studentId, childName: fullName(submission.student) },
  );

  revalidatePath("/", "layout");

  // Continue with the oldest work still waiting
  const next = await prisma.submission.findFirst({
    where: { status: "NEEDS_REVIEW", id: { not: submissionId } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  redirect(next ? `/admin/submissions/${next.id}` : "/admin/submissions");
}
