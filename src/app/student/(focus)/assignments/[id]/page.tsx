import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveDraft, submitWork } from "@/app/student/actions/drafts";
import { AttachmentsList } from "@/components/attachments/AttachmentsList";
import { Markdown } from "@/components/markdown/Markdown";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { parseRules } from "@/lib/autotests";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, isPast } from "@/lib/format";
import { pick, studentAssignmentWhere } from "@/lib/learning";
import { Workspace } from "./Workspace";

type Props = { params: Promise<{ id: string }> };

async function loadAssignment(userId: string, id: string) {
  return prisma.assignment.findFirst({
    where: { id, ...studentAssignmentWhere(userId) },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      starterHtml: true,
      starterCss: true,
      starterJs: true,
      maxScore: true,
      tests: true,
      lesson: { select: { id: true, titleUz: true, titleRu: true } },
      submissions: {
        where: { studentId: userId },
        orderBy: { attempt: "desc" },
        take: 1,
        select: { status: true, score: true, teacherComment: true },
      },
      deadlines: {
        where: { group: { members: { some: { userId } } } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
      drafts: { where: { userId }, select: { html: true, css: true, js: true } },
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

  return (
    <Workspace
      t={t}
      title={pick(locale, assignment.titleUz, assignment.titleRu)}
      lessonTitle={pick(locale, assignment.lesson.titleUz, assignment.lesson.titleRu)}
      backHref="/student/assignments"
      due={
        dueAt
          ? { label: isPast(dueAt) ? t.assignments.overdue : format(t.assignments.due, { date: formatDateTime(dueAt, locale) }), overdue: isPast(dueAt) }
          : null
      }
      maxScore={assignment.maxScore}
      starter={starter}
      initialCode={assignment.drafts[0] ?? starter}
      submission={
        lastSubmission
          ? { status: lastSubmission.status, score: lastSubmission.score, comment: lastSubmission.teacherComment }
          : null
      }
      tests={parseRules(assignment.tests)}
      saveDraft={saveDraft.bind(null, assignment.id)}
      submitWork={submitWork.bind(null, assignment.id)}
      description={
        <div className="space-y-5">
          {description.trim() && (
            <Markdown
              content={description}
              resultLabel={t.lessons.result}
              resultUrl={(i) => `/results/assignment/${assignment.id}/${descriptionLang}/${i}`}
            />
          )}
          <AttachmentsList items={assignment.attachments} t={t} />
        </div>
      }
    />
  );
}
