import { AlertTriangle, BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, Send, Star } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDays, daysAgo, formatDay, formatRelative, tashkentToday } from "@/lib/format";
import { getStudentReport, needsAttention } from "@/lib/progress";
import { fullName } from "@/lib/users";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ACTIVITY_DAYS = 14;

function average(values: (number | null)[]) {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
}

const tashkentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" });

export default async function AdminStatsPage({ searchParams }: Props) {
  await requireUser("ADMIN");
  const { t, locale } = await getDictionary();
  const ts = t.stats;
  const { group: rawGroup } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (groups.length === 0) {
    return (
      <>
        <PageHeader title={ts.title} subtitle={ts.subtitle} />
        <div className="card text-center text-muted">{ts.noGroups}</div>
      </>
    );
  }

  const group = groups.find((g) => g.id === rawGroup) ?? groups[0];
  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id, user: { role: "STUDENT", isActive: true } },
    select: { user: { select: { id: true, firstName: true, lastName: true, lastLoginAt: true } } },
  });
  const studentIds = members.map((m) => m.user.id);

  const [reports, pending, submissions] = await Promise.all([
    Promise.all(members.map(async ({ user }) => ({ user, report: await getStudentReport(user.id) }))),
    prisma.submission.count({ where: { studentId: { in: studentIds }, status: { in: ["SUBMITTED", "NEEDS_REVIEW"] } } }),
    prisma.submission.findMany({
      where: { studentId: { in: studentIds }, createdAt: { gte: daysAgo(ACTIVITY_DAYS) } },
      select: { createdAt: true },
    }),
  ]);

  const rows = reports
    .map(({ user, report }) => {
      const s = report.summary;
      return {
        user,
        summary: s,
        lessonsPercent: s.lessonsTotal ? Math.round((s.lessonsDone / s.lessonsTotal) * 100) : null,
        attention: needsAttention(s),
      };
    })
    .sort((a, b) => Number(b.attention) - Number(a.attention) || fullName(a.user).localeCompare(fullName(b.user)));

  const today = tashkentToday();
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => addDays(today, i - ACTIVITY_DAYS + 1));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const { createdAt } of submissions) {
    const day = tashkentDate.format(createdAt);
    if (perDay.has(day)) perDay.set(day, perDay.get(day)! + 1);
  }
  const maxPerDay = Math.max(1, ...perDay.values());
  const recent = [...perDay.values()].reduce((a, b) => a + b, 0);

  const avgLessons = average(rows.map((r) => r.lessonsPercent));
  const avgScore = average(rows.map((r) => r.summary.averageScore));
  const avgAttendance = average(rows.map((r) => r.summary.attendanceRate));
  const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

  const tiles = [
    { label: ts.students, value: String(rows.length), icon: GraduationCap },
    { label: ts.avgLessons, value: percent(avgLessons), icon: BookOpen },
    { label: ts.avgScore, value: percent(avgScore), icon: Star },
    { label: ts.attendance, value: percent(avgAttendance), icon: CalendarCheck },
    { label: ts.pending, value: String(pending), icon: ClipboardCheck, href: "/admin/submissions", highlight: pending > 0 },
    { label: ts.submissions, value: String(recent), icon: Send },
  ];

  return (
    <>
      <PageHeader title={ts.title} subtitle={ts.subtitle} />

      <div className="mb-5 flex flex-wrap gap-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/admin/stats?group=${g.id}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
              g.id === group.id ? "border-primary bg-primary text-white" : "border-border bg-surface hover:border-primary"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-6">
        {tiles.map(({ label, value, icon: Icon, href, highlight }) => {
          const body = (
            <>
              <Icon size={20} className={highlight ? "text-accent" : "text-primary"} />
              <p className="mt-2 text-2xl font-extrabold">{value}</p>
              <p className="text-sm font-semibold text-muted">{label}</p>
            </>
          );
          const cls = `card ${highlight ? "border-accent bg-accent/10" : ""}`;
          return href ? (
            <Link key={label} href={href} className={`${cls} transition hover:-translate-y-0.5 hover:shadow-lg`}>
              {body}
            </Link>
          ) : (
            <div key={label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>

      <section className="card mt-5">
        <h2 className="mb-4 font-extrabold">{ts.activity}</h2>
        <div className="flex h-36 items-end gap-1 sm:gap-2">
          {days.map((day) => {
            const count = perDay.get(day)!;
            return (
              <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] font-bold text-muted">{count || ""}</span>
                <div
                  className={`w-full rounded-t-md ${count ? "bg-primary" : "bg-border"}`}
                  style={{ height: `${Math.max(4, (count / maxPerDay) * 100)}%` }}
                  title={`${formatDay(day, locale, { day: "numeric", month: "short" })}: ${count}`}
                />
                <span className="text-[10px] text-muted">{Number(day.slice(8))}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-5 p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-extrabold">{group.name}</h2>
          <p className="text-xs text-muted">{ts.sortHint}</p>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted">{ts.noStudents}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-2">{ts.student}</th>
                  <th className="px-3 py-2">{ts.lessons}</th>
                  <th className="px-3 py-2">{ts.score}</th>
                  <th className="px-3 py-2">{ts.attendance}</th>
                  <th className="px-3 py-2">{ts.accepted}</th>
                  <th className="px-3 py-2">{ts.overdue}</th>
                  <th className="px-3 py-2">{ts.lastLogin}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ user, summary, lessonsPercent, attention }) => (
                  <tr key={user.id} className="border-t border-border/60">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/students/${user.id}`} className="flex items-center gap-2 font-bold hover:text-primary">
                        {attention && <AlertTriangle size={15} className="shrink-0 text-danger" />}
                        {fullName(user)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-primary" style={{ width: `${lessonsPercent ?? 0}%` }} />
                        </div>
                        {percent(lessonsPercent)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{percent(summary.averageScore)}</td>
                    <td className={`px-3 py-2.5 ${summary.attendanceRate !== null && summary.attendanceRate < 80 ? "font-bold text-danger" : ""}`}>
                      {percent(summary.attendanceRate)}
                    </td>
                    <td className="px-3 py-2.5">
                      {summary.accepted}/{summary.assignmentsTotal}
                    </td>
                    <td className={`px-3 py-2.5 ${summary.overdue ? "font-bold text-danger" : ""}`}>{summary.overdue}</td>
                    <td className="px-3 py-2.5 text-muted">
                      {user.lastLoginAt ? formatRelative(user.lastLoginAt.toISOString(), locale) : ts.never}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
