import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import { kickAiQueue } from "@/lib/ai/queue";
import { SearchFilters } from "@/components/admin/SearchFilters";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { AssignmentStatusBadge } from "@/components/learn/AssignmentStatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { Prisma } from "@/generated/prisma/client";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { readAiReport } from "@/lib/ai/review";
import { readSummary } from "@/lib/integrity";
import { pick } from "@/lib/learning";
import { fullName, userSearchWhere } from "@/lib/users";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const param = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim() : "");

const SEVERE_FLAGS = new Set(["mostlyPasted", "replayMismatch", "tooFast"]);
const AI_TONES = { PASSED: "success", NEEDS_REVIEW: "accent", SUSPECTED_AI: "danger" } as const;

// Gives the background AI review time to finish on Vercel
export const maxDuration = 60;

export default async function SubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("ADMIN");
  const { t, locale } = await getDictionary();
  const sp = await searchParams;
  const q = param(sp.q);
  const group = param(sp.group);
  const status = param(sp.status) || "NEEDS_REVIEW";

  // Resume AI reviews left in the queue (no-op when there's nothing to do or no key)
  after(() => kickAiQueue());

  const where: Prisma.SubmissionWhereInput = {};
  if (status === "NEEDS_REVIEW" || status === "RETURNED" || status === "ACCEPTED") where.status = status;
  const studentWhere: Prisma.UserWhereInput = {
    ...(q && userSearchWhere(q)),
    ...(group && { groupMemberships: { some: { groupId: group } } }),
  };
  if (q || group) where.student = studentWhere;

  const [submissions, groups] = await Promise.all([
    prisma.submission.findMany({
      where,
      // The review queue is worked through oldest first
      orderBy: { createdAt: status === "NEEDS_REVIEW" ? "asc" : "desc" },
      take: 300,
      select: {
        id: true,
        attempt: true,
        status: true,
        score: true,
        isLate: true,
        createdAt: true,
        integrity: true,
        autotestScore: true,
        aiStatus: true,
        aiReport: true,
        student: {
          select: { firstName: true, lastName: true, groupMemberships: { select: { group: { select: { name: true } } } } },
        },
        assignment: {
          select: { titleUz: true, titleRu: true, maxScore: true, lesson: { select: { titleUz: true, titleRu: true } } },
        },
      },
    }),
    prisma.group.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title={t.submissions.title} subtitle={t.submissions.subtitle} />

      <SearchFilters
        t={t}
        q={q}
        selects={[
          {
            name: "status",
            value: status,
            options: [
              { value: "NEEDS_REVIEW", label: t.submissions.statusNeedsReview },
              { value: "RETURNED", label: t.submissions.statusReturned },
              { value: "ACCEPTED", label: t.submissions.statusAccepted },
              { value: "all", label: t.submissions.statusAll },
            ],
          },
          {
            name: "group",
            value: group,
            options: [{ value: "", label: t.submissions.allGroups }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
          },
        ]}
      />

      {submissions.length === 0 ? (
        <p className="card py-10 text-center text-muted">
          {status === "NEEDS_REVIEW" && !q && !group ? t.submissions.emptyQueue : t.submissions.empty}
        </p>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden p-0">
          {submissions.map((s) => {
            const name = fullName(s.student);
            const flags = readSummary(s.integrity)?.flags ?? [];
            return (
              <li key={s.id}>
                <Link href={`/admin/submissions/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {name}
                      <span className="font-normal text-muted"> · {s.student.groupMemberships.map((m) => m.group.name).join(", ")}</span>
                    </p>
                    <p className="truncate text-sm">
                      {pick(locale, s.assignment.titleUz, s.assignment.titleRu)}
                      <span className="text-muted"> · {pick(locale, s.assignment.lesson.titleUz, s.assignment.lesson.titleRu)}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <AssignmentStatusBadge status={s.status} t={t} />
                      {s.score !== null && <Badge tone="success">{format(t.submissions.scoreOf, { score: s.score, max: s.assignment.maxScore })}</Badge>}
                      <Badge>{format(t.submissions.attempt, { n: s.attempt })}</Badge>
                      {s.isLate && <Badge tone="danger">{t.submissions.late}</Badge>}
                      {s.autotestScore !== null && (
                        <Badge tone={s.autotestScore >= 80 ? "success" : s.autotestScore >= 50 ? "accent" : "danger"}>
                          {format(t.autotests.badge, { percent: s.autotestScore })}
                        </Badge>
                      )}
                      {(s.aiStatus === "QUEUED" || s.aiStatus === "RUNNING") && <Badge>{t.ai.badgeRunning}</Badge>}
                      {(() => {
                        const verdict = readAiReport(s.aiReport)?.verdict;
                        return verdict && <Badge tone={AI_TONES[verdict]}>{t.ai.verdict[verdict]}</Badge>;
                      })()}
                      {flags.map((flag) => (
                        <Badge key={flag} tone={SEVERE_FLAGS.has(flag) ? "danger" : "accent"}>
                          {t.integrity.flags[flag]}
                        </Badge>
                      ))}
                      <span className="flex items-center gap-1 text-muted">
                        <Clock size={12} />
                        {formatDateTime(s.createdAt, locale)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
