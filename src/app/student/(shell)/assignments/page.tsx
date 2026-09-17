import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/learn/AssignmentStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, isPast } from "@/lib/format";
import { assignmentProgress, pick, studentAssignmentWhere, type AssignmentProgress } from "@/lib/learning";

const sectionOf: Record<AssignmentProgress, "todo" | "review" | "done"> = {
  NOT_STARTED: "todo",
  IN_PROGRESS: "todo",
  RETURNED: "todo",
  SUBMITTED: "review",
  NEEDS_REVIEW: "review",
  ACCEPTED: "done",
};

export default async function StudentAssignmentsPage() {
  const user = await requireUser("STUDENT");
  const { t, locale } = await getDictionary();

  const assignments = await prisma.assignment.findMany({
    where: studentAssignmentWhere(user.id),
    orderBy: [
      { lesson: { module: { course: { order: "asc" } } } },
      { lesson: { module: { order: "asc" } } },
      { lesson: { order: "asc" } },
      { order: "asc" },
    ],
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      lesson: { select: { titleUz: true, titleRu: true } },
      deadlines: {
        where: { group: { members: { some: { userId: user.id } } } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
      drafts: { where: { userId: user.id }, select: { updatedAt: true } },
      maxScore: true,
      submissions: { where: { studentId: user.id }, orderBy: { attempt: "desc" }, take: 1, select: { status: true, score: true } },
    },
  });

  const items = assignments.map((a) => ({ ...a, status: assignmentProgress(a), dueAt: a.deadlines[0]?.dueAt ?? null }));

  // Nearest deadline first; assignments without a deadline keep the course order
  const byDeadline = (a: (typeof items)[number], b: (typeof items)[number]) =>
    (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);

  const sections = (["todo", "review", "done"] as const).map((key) => ({
    key,
    items: items.filter((i) => sectionOf[i.status] === key).sort(key === "todo" ? byDeadline : () => 0),
  }));

  return (
    <>
      <PageHeader title={t.nav.assignments} />

      {items.length === 0 ? (
        <p className="card py-10 text-center text-muted">{t.assignments.empty}</p>
      ) : (
        <div className="space-y-6">
          {sections.map(({ key, items: sectionItems }) =>
            sectionItems.length === 0 && key !== "todo" ? null : (
              <section key={key}>
                <h2 className="mb-2 text-lg font-extrabold">
                  {t.assignments.sections[key]} <span className="text-muted">· {sectionItems.length}</span>
                </h2>
                {sectionItems.length === 0 ? (
                  <p className="card text-muted">{t.assignments.emptyTodo}</p>
                ) : (
                  <ul className="card divide-y divide-border overflow-hidden p-0">
                    {sectionItems.map((item) => {
                      const overdue = key === "todo" && item.dueAt !== null && isPast(item.dueAt);
                      return (
                        <li key={item.id}>
                          <Link href={`/student/assignments/${item.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">{pick(locale, item.titleUz, item.titleRu)}</p>
                              <p className="truncate text-xs text-muted">{pick(locale, item.lesson.titleUz, item.lesson.titleRu)}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <AssignmentStatusBadge status={item.status} t={t} />
                                {item.submissions[0]?.score != null && (
                                  <span className="text-xs font-bold text-success">
                                    {format(t.submissions.scoreOf, { score: item.submissions[0].score, max: item.maxScore })}
                                  </span>
                                )}
                                {item.dueAt && key === "todo" && (
                                  <span className={`flex items-center gap-1 text-xs font-semibold ${overdue ? "text-danger" : "text-muted"}`}>
                                    <CalendarClock size={14} />
                                    {overdue ? t.assignments.overdue : format(t.assignments.due, { date: formatDateTime(item.dueAt, locale) })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={18} className="shrink-0 text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ),
          )}
        </div>
      )}
    </>
  );
}
