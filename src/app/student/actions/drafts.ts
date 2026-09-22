"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { geminiConfigured } from "@/lib/ai/gemini";
import { kickAiQueue } from "@/lib/ai/queue";
import { autotestScore, parseResults, parseRules } from "@/lib/autotests";
import { notify } from "@/lib/notifications";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mergeSegment, parseSegment, parseSegments, summarize } from "@/lib/integrity";
import { studentOpenAssignmentWhere } from "@/lib/learning";
import type { CodeFiles } from "@/lib/preview";

const MAX_FILE = 100_000;

function cleanCode(code: CodeFiles | undefined): CodeFiles {
  const clean = (value: unknown) => (typeof value === "string" ? value.slice(0, MAX_FILE) : "");
  return { html: clean(code?.html), css: clean(code?.css), js: clean(code?.js) };
}

/** While a submission is waiting for review or was accepted, the code can't change. */
const LOCKED_STATUSES = new Set(["SUBMITTED", "NEEDS_REVIEW", "ACCEPTED"]);

async function loadForStudent(userId: string, assignmentId: string) {
  return prisma.assignment.findFirst({
    where: { id: assignmentId, ...(await studentOpenAssignmentWhere(userId)) },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      starterHtml: true,
      starterCss: true,
      starterJs: true,
      tests: true,
      aiReviewEnabled: true,
      deadlines: {
        where: { group: { members: { some: { userId } } } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
      submissions: { where: { studentId: userId }, orderBy: { attempt: "desc" }, take: 1, select: { attempt: true, status: true } },
      drafts: { where: { userId }, select: { replay: true } },
    },
  });
}

/** Autosave of the student's work in progress together with the current editing session. */
export async function saveDraft(assignmentId: string, code: CodeFiles, segment: unknown) {
  const user = await requireUser("STUDENT");

  const assignment = await loadForStudent(user.id, assignmentId);
  if (!assignment) return { ok: false };
  if (LOCKED_STATUSES.has(assignment.submissions[0]?.status ?? "")) return { ok: false, locked: true };

  const data = {
    ...cleanCode(code),
    replay: mergeSegment(parseSegments(assignment.drafts[0]?.replay), parseSegment(segment)) as unknown as Prisma.InputJsonValue,
  };

  await prisma.codeDraft.upsert({
    where: { userId_assignmentId: { userId: user.id, assignmentId } },
    create: { userId: user.id, assignmentId, ...data },
    update: data,
  });
  return { ok: true };
}

export async function submitWork(assignmentId: string, code: CodeFiles, segment: unknown, autotestResults: unknown) {
  const user = await requireUser("STUDENT");
  const { t } = await getDictionary();

  const assignment = await loadForStudent(user.id, assignmentId);
  if (!assignment) return { ok: false, message: t.common.errors.notFound };

  const last = assignment.submissions[0];
  if (last && LOCKED_STATUSES.has(last.status)) return { ok: false, message: t.submissions.alreadySubmitted };

  const files = cleanCode(code);
  if (!files.html.trim() && !files.css.trim() && !files.js.trim()) return { ok: false, message: t.submissions.emptyCode };

  const starter = { html: assignment.starterHtml, css: assignment.starterCss, js: assignment.starterJs };
  const segments = mergeSegment(parseSegments(assignment.drafts[0]?.replay), parseSegment(segment));
  const now = new Date();
  const dueAt = assignment.deadlines[0]?.dueAt;
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });

  // Run in the student's browser; the teacher's review page re-runs them to confirm
  const rules = parseRules(assignment.tests);
  const results = rules.length > 0 ? parseResults(autotestResults, rules) : null;
  const queueAi = assignment.aiReviewEnabled && geminiConfigured();

  let submissionId: string;
  try {
    const [created] = await prisma.$transaction([
      prisma.submission.create({
        select: { id: true },
        data: {
          assignmentId,
          studentId: user.id,
          attempt: (last?.attempt ?? 0) + 1,
          ...files,
          status: "NEEDS_REVIEW",
          isLate: !!dueAt && now > dueAt,
          autotestResults: results ? (results as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          autotestScore: results ? autotestScore(rules, results) : null,
          aiStatus: queueAi ? "QUEUED" : "NONE",
          integrity: summarize(segments, files, starter) as unknown as Prisma.InputJsonValue,
          replay: segments as unknown as Prisma.InputJsonValue,
        },
      }),
      // The next attempt is recorded from scratch, starting at the submitted code
      prisma.codeDraft.upsert({
        where: { userId_assignmentId: { userId: user.id, assignmentId } },
        create: { userId: user.id, assignmentId, ...files },
        update: { ...files, replay: Prisma.DbNull },
      }),
    ]);
    submissionId = created.id;
  } catch (error) {
    // Unique (assignment, student, attempt): a double click already created this attempt
    if (typeof error === "object" && error && (error as { code?: string }).code === "P2002") {
      return { ok: false, message: t.submissions.alreadySubmitted };
    }
    throw error;
  }

  await notify(
    admins.map((admin) => admin.id),
    "submission.new",
    {
      submissionId,
      assignmentId,
      studentName: `${user.lastName} ${user.firstName}`.trim(),
      titleUz: assignment.titleUz,
      titleRu: assignment.titleRu,
    },
  );

  revalidatePath("/", "layout");
  if (queueAi) after(() => kickAiQueue());
  return { ok: true, message: t.submissions.sent };
}
