import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ClipboardCheck, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pick } from "@/lib/learning";
import { getStudentReport, needsAttention } from "@/lib/progress";
import { fullName } from "@/lib/users";

export default async function ParentDashboard() {
  const user = await requireUser("PARENT");
  const { t, locale } = await getDictionary();
  const tp = t.progress;

  const links = await prisma.parentChild.findMany({
    where: { parentId: user.id, child: { isActive: true, role: "STUDENT" } },
    orderBy: { child: { firstName: "asc" } },
    select: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          groupMemberships: { where: { group: { isArchived: false } }, select: { group: { select: { name: true } } } },
        },
      },
    },
  });
  const children = await Promise.all(links.map(async ({ child }) => ({ child, report: await getStudentReport(child.id) })));

  return (
    <>
      <PageHeader title={format(t.dashboard.hello, { name: user.firstName })} subtitle={t.dashboard.parentSubtitle} />

      {children.length === 0 ? (
        <p className="card text-muted">{t.dashboard.noChildren}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map(({ child, report }) => {
            const name = fullName(child);
            const s = report.summary;
            const attention = needsAttention(s);
            const upcoming = report.assignments
              .filter((a) => a.dueAt && !a.overdue && (a.status === "NOT_STARTED" || a.status === "IN_PROGRESS" || a.status === "RETURNED"))
              .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
              .slice(0, 2);

            const stats = [
              { label: tp.lessons, value: s.lessonsTotal ? `${Math.round((s.lessonsDone / s.lessonsTotal) * 100)}%` : "—", icon: CheckCircle2 },
              { label: tp.averageScore, value: s.averageScore !== null ? `${s.averageScore}%` : "—", icon: Star },
              { label: tp.attendance, value: s.attendanceRate !== null ? `${s.attendanceRate}%` : "—", icon: CalendarCheck },
              { label: tp.accepted, value: `${s.accepted}/${s.assignmentsTotal}`, icon: ClipboardCheck },
            ];

            return (
              <section key={child.id} className="card flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={name} size={52} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-extrabold">{name}</h2>
                    <p className="truncate text-sm text-muted">{child.groupMemberships.map((m) => m.group.name).join(", ") || t.dashboard.noGroup}</p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                      attention ? "bg-danger-soft text-danger" : "bg-success/10 text-success"
                    }`}
                  >
                    {attention ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    {attention ? tp.needsAttention : tp.allGood}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl bg-background px-3 py-2">
                      <Icon size={16} className="text-primary" />
                      <p className="mt-1 text-lg font-extrabold">{value}</p>
                      <p className="text-[11px] font-semibold leading-tight text-muted">{label}</p>
                    </div>
                  ))}
                </div>

                {(s.overdue > 0 || s.returned > 0) && (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                    {[s.overdue > 0 && `${tp.overdue}: ${s.overdue}`, s.returned > 0 && format(tp.returned, { n: s.returned })].filter(Boolean).join(" · ")}
                  </p>
                )}

                {upcoming.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {upcoming.map((a) => (
                      <li key={a.id} className="flex flex-wrap justify-between gap-x-2">
                        <span className="min-w-0 truncate font-semibold">{pick(locale, a.titleUz, a.titleRu)}</span>
                        <span className="text-xs text-muted">{format(tp.due, { date: formatDateTime(a.dueAt!, locale) })}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/parent/children/${child.id}`} className="btn btn-primary">
                    {tp.details}
                    <ArrowRight size={18} />
                  </Link>
                  <Link href="/parent/chat" className="btn border border-border bg-surface">
                    <MessageCircle size={18} />
                    {tp.writeTeacher}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
