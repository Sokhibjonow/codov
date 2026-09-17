import { Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BackLink } from "@/components/admin/BackLink";
import { AiReviewCard } from "@/components/review/AiReviewCard";
import { AutotestsCard } from "@/components/review/AutotestsCard";
import { geminiConfigured } from "@/lib/ai/gemini";
import { kickAiQueue } from "@/lib/ai/queue";
import { readAiReport } from "@/lib/ai/review";
import { parseResults, parseRules } from "@/lib/autotests";
import { Avatar } from "@/components/Avatar";
import { AssignmentStatusBadge } from "@/components/learn/AssignmentStatusBadge";
import { Markdown } from "@/components/markdown/Markdown";
import { IntegrityCard } from "@/components/review/IntegrityCard";
import { ReviewForm } from "@/components/review/ReviewForm";
import { SubmissionViewer } from "@/components/review/SubmissionViewer";
import { Badge } from "@/components/ui/Badge";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { parseSegments, readSummary } from "@/lib/integrity";
import { pick } from "@/lib/learning";
import { fullName } from "@/lib/users";
import { requeueAiReview, reviewSubmission, saveAutotestResults } from "../actions";

// Gives the background AI review time to finish on Vercel
export const maxDuration = 60;

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      id: true,
      attempt: true,
      status: true,
      score: true,
      teacherComment: true,
      isLate: true,
      createdAt: true,
      reviewedAt: true,
      html: true,
      css: true,
      js: true,
      integrity: true,
      replay: true,
      autotestResults: true,
      aiStatus: true,
      aiReport: true,
      aiError: true,
      studentId: true,
      student: {
        select: { firstName: true, lastName: true, login: true, groupMemberships: { select: { group: { select: { name: true } } } } },
      },
      assignment: {
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          descriptionUz: true,
          descriptionRu: true,
          maxScore: true,
          tests: true,
          aiReviewEnabled: true,
          lesson: { select: { titleUz: true, titleRu: true } },
        },
      },
    },
  });
  if (!submission) notFound();

  // Continue any AI reviews waiting in the queue (e.g. after a server restart)
  if (submission.aiStatus === "QUEUED") after(() => kickAiQueue());

  const rules = parseRules(submission.assignment.tests);
  const aiReport = readAiReport(submission.aiReport);
  const code = { html: submission.html, css: submission.css, js: submission.js };

  const attempts = await prisma.submission.findMany({
    where: { assignmentId: submission.assignment.id, studentId: submission.studentId },
    orderBy: { attempt: "desc" },
    select: { id: true, attempt: true, status: true, score: true, createdAt: true },
  });

  const name = fullName(submission.student);
  const description = pick(locale, submission.assignment.descriptionUz, submission.assignment.descriptionRu);

  return (
    <>
      <BackLink href="/admin/submissions" label={t.submissions.title} />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Avatar name={name} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold md:text-2xl">{pick(locale, submission.assignment.titleUz, submission.assignment.titleRu)}</h1>
          <p className="truncate text-sm text-muted">
            <span className="font-bold text-foreground">{name}</span> · {submission.student.groupMemberships.map((m) => m.group.name).join(", ")} ·{" "}
            {pick(locale, submission.assignment.lesson.titleUz, submission.assignment.lesson.titleRu)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <AssignmentStatusBadge status={submission.status} t={t} />
            <Badge>{format(t.submissions.attempt, { n: submission.attempt })}</Badge>
            {submission.isLate && <Badge tone="danger">{t.submissions.late}</Badge>}
            <span className="flex items-center gap-1 text-muted">
              <Clock size={12} />
              {format(t.submissions.submittedAt, { date: formatDateTime(submission.createdAt, locale) })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SubmissionViewer
          t={t}
          code={code}
          segments={parseSegments(submission.replay)}
          task={description.trim() ? <Markdown content={description} resultLabel={t.lessons.result} hiddenCodeNote={t.lessons.codeHidden} /> : null}
        />

        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-1 text-lg font-extrabold">{t.submissions.review}</h2>
            {submission.reviewedAt && (
              <p className="mb-3 text-xs text-muted">{format(t.submissions.reviewedAt, { date: formatDateTime(submission.reviewedAt, locale) })}</p>
            )}
            <ReviewForm
              t={t}
              maxScore={submission.assignment.maxScore}
              defaults={{ score: submission.score, comment: submission.teacherComment }}
              action={reviewSubmission.bind(null, submission.id)}
              aiFeedback={aiReport?.feedback}
            />
          </section>

          {rules.length > 0 && (
            <AutotestsCard
              t={t}
              rules={rules}
              code={code}
              stored={submission.autotestResults ? parseResults(submission.autotestResults, rules) : null}
              save={saveAutotestResults.bind(null, submission.id)}
            />
          )}

          <AiReviewCard
            t={t}
            status={submission.aiStatus}
            report={aiReport}
            error={submission.aiError}
            configured={geminiConfigured()}
            enabled={submission.assignment.aiReviewEnabled}
            requeue={requeueAiReview.bind(null, submission.id)}
          />

          <IntegrityCard summary={readSummary(submission.integrity)} t={t} />

          {attempts.length > 1 && (
            <section className="card p-0">
              <h2 className="border-b border-border px-4 py-3 font-extrabold">{t.submissions.attempts}</h2>
              <ul className="divide-y divide-border">
                {attempts.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/submissions/${a.id}`}
                      aria-current={a.id === submission.id ? "page" : undefined}
                      className={`flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm hover:bg-background ${a.id === submission.id ? "bg-primary-soft/60" : ""}`}
                    >
                      <span className="font-bold">{format(t.submissions.attempt, { n: a.attempt })}</span>
                      <AssignmentStatusBadge status={a.status} t={t} />
                      {a.score !== null && <span className="font-semibold">{a.score}</span>}
                      <span className="ml-auto text-xs text-muted">{formatDateTime(a.createdAt, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
