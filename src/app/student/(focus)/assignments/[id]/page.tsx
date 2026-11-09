import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { saveAnswerDraft, saveDraft, submitAnswer, submitWork } from "@/app/student/actions/drafts";
import { AttachmentsList } from "@/components/attachments/AttachmentsList";
import { Markdown } from "@/components/markdown/Markdown";
import { kickAiQueue } from "@/lib/ai/queue";
import { readAiReport } from "@/lib/ai/review";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { parseRules } from "@/lib/autotests";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, isPast } from "@/lib/format";
import { pick, studentOpenAssignmentWhere } from "@/lib/learning";
import { TextWorkspace } from "./TextWorkspace";
import { Workspace } from "./Workspace";

type Props = { params: Promise<{ id: string }> };

async function loadAssignment(userId: string, id: string) {
  return prisma.assignment.findFirst({
    where: { id, ...(await studentOpenAssignmentWhere(userId)) },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      starterHtml: true,
      starterCss: true,
      starterJs: true,
      kind: true,
      templateUz: true,
      templateRu: true,
      maxScore: true,
      tests: true,
      lesson: { select: { id: true, titleUz: true, titleRu: true } },
      submissions: {
        where: { studentId: userId },
        orderBy: { attempt: "desc" },
        take: 1,
        select: { status: true, score: true, teacherComment: true, aiStatus: true, aiReport: true },
      },
      deadlines: {
        where: { group: { members: { some: { userId } } } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
      drafts: { where: { userId }, select: { html: true, css: true, js: true, answer: true } },
      attachments: { orderBy: attachmentOrder, select: attachmentSelect },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser("STUDENT");
  const { locale } = await getDictionary();
  const assignment = await loadAssignment(user.id, (await params).id);
  return { title: assignment ? pick(locale, assignment.titleUz, assignment.titleRu) : undefined };
}

// Gives the background AI review time to finish on Vercel
export const maxDuration = 60;

export default async function AssignmentWorkspacePage({ params }: Props) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const assignment = await loadAssignment(user.id, id);
  if (!assignment) notFound();

  const starter = { html: assignment.starterHtml, css: assignment.starterCss, js: assignment.starterJs };
  const dueAt = assignment.deadlines[0]?.dueAt;
  const description = pick(locale, assignment.descriptionUz, assignment.descriptionRu);
  const descriptionLang = description === assignment.descriptionUz ? "uz" : "ru";
  const lastSubmission = assignment.submissions[0];
  // The student's page also moves the AI queue on, so the feedback arrives while they wait
  if (lastSubmission?.aiStatus === "QUEUED") after(() => kickAiQueue());
  const report = lastSubmission?.aiStatus === "DONE" ? readAiReport(lastSubmission.aiReport) : null;
  const aiFeedback =
    !lastSubmission || lastSubmission.status === "ACCEPTED"
      ? null
      : lastSubmission.aiStatus === "QUEUED" || lastSubmission.aiStatus === "RUNNING"
        ? ({ state: "pending" } as const)
        : report
          ? ({ state: "done", ...(report.feedback[locale] ?? report.feedback.uz) } as const)
          : null;

  const common = {
    t,
    title: pick(locale, assignment.titleUz, assignment.titleRu),
    lessonTitle: pick(locale, assignment.lesson.titleUz, assignment.lesson.titleRu),
    backHref: "/student/assignments",
    due: dueAt
      ? { label: isPast(dueAt) ? t.assignments.overdue : format(t.assignments.due, { date: formatDateTime(dueAt, locale) }), overdue: isPast(dueAt) }
      : null,
    maxScore: assignment.maxScore,
    submission: lastSubmission
      ? { status: lastSubmission.status, score: lastSubmission.score, comment: lastSubmission.teacherComment, ai: aiFeedback }
      : null,
    // Keyed: the workspace renders it among other children and it can reach the client as a lazy chunk
    description: (
      <div key="description" className="space-y-5">
        {description.trim() && (
          <Markdown
            content={description}
            resultLabel={t.lessons.result}
            resultUrl={(i) => `/results/assignment/${assignment.id}/${descriptionLang}/${i}`}
          />
        )}
        <AttachmentsList items={assignment.attachments} t={t} />
      </div>
    ),
  };

  if (assignment.kind === "TEXT") {
    const template = pick(locale, assignment.templateUz, assignment.templateRu);
    const draft = assignment.drafts[0]?.answer;
    return (
      <TextWorkspace
        {...common}
        template={template}
        initialAnswer={draft || template}
        saveDraft={saveAnswerDraft.bind(null, assignment.id)}
        submitAnswer={submitAnswer.bind(null, assignment.id)}
      />
    );
  }

  return (
    <Workspace
      {...common}
      starter={starter}
      initialCode={assignment.drafts[0] ?? starter}
      tests={parseRules(assignment.tests)}
      saveDraft={saveDraft.bind(null, assignment.id)}
      submitWork={submitWork.bind(null, assignment.id)}
    />
  );
}
