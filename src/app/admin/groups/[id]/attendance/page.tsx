import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/admin/BackLink";
import { ATTENDANCE_TONES } from "@/components/progress/StudentReport";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDays, formatDay, fromDbDate, isDateString, tashkentToday, toDbDate } from "@/lib/format";
import { fullName } from "@/lib/users";
import { saveAttendance } from "../../attendance-actions";
import { AttendanceRows } from "./AttendanceRows";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const cellClass = {
  success: "bg-success/15 text-success",
  accent: "bg-accent/20 text-[#b45309]",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-primary-soft text-primary",
} as const;

function monthStart(day: string, offset: number) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

export default async function GroupAttendancePage({ params, searchParams }: Props) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { date: rawDate } = await searchParams;
  const { t, locale } = await getDictionary();

  const today = tashkentToday();
  const day = typeof rawDate === "string" && isDateString(rawDate) ? rawDate : today;
  const firstOfMonth = monthStart(day, 0);
  const firstOfNextMonth = monthStart(day, 1);

  const group = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      members: {
        where: { user: { role: "STUDENT" } },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
        select: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!group) notFound();

  const [dayRecords, monthRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { groupId: id, date: toDbDate(day) }, select: { studentId: true, status: true, note: true } }),
    prisma.attendanceRecord.findMany({
      where: { groupId: id, date: { gte: toDbDate(firstOfMonth), lt: toDbDate(firstOfNextMonth) } },
      select: { studentId: true, date: true, status: true },
    }),
  ]);

  const students = group.members.map((m) => ({ id: m.user.id, name: fullName(m.user) }));
  const initial = Object.fromEntries(dayRecords.map((r) => [r.studentId, { status: r.status, note: r.note }]));
  const monthDays = [...new Set(monthRecords.map((r) => fromDbDate(r.date)))].sort();
  const monthCells = new Map(monthRecords.map((r) => [`${r.studentId}:${fromDbDate(r.date)}`, r.status]));

  const navLink = "btn border border-border bg-surface p-2";

  return (
    <>
      <BackLink href={`/admin/groups/${id}`} label={group.name} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight md:text-3xl">
        {t.attendance.title} · {group.name}
      </h1>

      <section className="card mb-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`?date=${addDays(day, -1)}`} className={navLink} title={t.attendance.prevDay} aria-label={t.attendance.prevDay}>
            <ChevronLeft size={18} />
          </Link>
          <form className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={day} max={today} className="input w-auto py-2" aria-label={t.attendance.date} />
            <button type="submit" className="btn border border-border bg-surface px-3 py-2 text-sm">
              {t.attendance.show}
            </button>
          </form>
          <Link href={`?date=${addDays(day, 1)}`} className={navLink} title={t.attendance.nextDay} aria-label={t.attendance.nextDay}>
            <ChevronRight size={18} />
          </Link>
          {day !== today && (
            <Link href="?" className="btn btn-ghost px-3 py-2 text-sm">
              {t.attendance.today}
            </Link>
          )}
          <p className="w-full text-lg font-extrabold first-letter:uppercase sm:ml-auto sm:w-auto">
            {formatDay(day, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-muted">{t.attendance.noStudents}</p>
        ) : (
          <ActionForm key={day} action={saveAttendance.bind(null, id)} submitLabel={t.common.save}>
            <input type="hidden" name="date" value={day} />
            <AttendanceRows t={t} students={students} initial={initial} />
          </ActionForm>
        )}
      </section>

      <section className="card p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-lg font-extrabold">
            {t.attendance.monthTitle} ·{" "}
            <span className="inline-block first-letter:uppercase">{formatDay(firstOfMonth, locale, { month: "long", year: "numeric" })}</span>
          </h2>
          <Link href={`?date=${monthStart(day, -1)}`} className={navLink} title={t.attendance.prevMonth} aria-label={t.attendance.prevMonth}>
            <ChevronLeft size={16} />
          </Link>
          <Link href={`?date=${firstOfNextMonth}`} className={navLink} title={t.attendance.nextMonth} aria-label={t.attendance.nextMonth}>
            <ChevronRight size={16} />
          </Link>
        </div>

        {monthDays.length === 0 || students.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">{t.attendance.noRecordsMonth}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="sticky left-0 bg-surface px-3 py-2 text-left">#</th>
                  {monthDays.map((d) => (
                    <th key={d} className="px-1 py-2 text-center font-bold">
                      <Link href={`?date=${d}`} className={`rounded px-1 hover:text-primary ${d === day ? "text-primary underline" : ""}`}>
                        {Number(d.slice(8))}
                      </Link>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">{t.attendance.rate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => {
                  const statuses = monthDays.map((d) => monthCells.get(`${student.id}:${d}`));
                  const marked = statuses.filter((s) => s && s !== "EXCUSED").length;
                  const attended = statuses.filter((s) => s === "PRESENT" || s === "LATE").length;
                  return (
                    <tr key={student.id}>
                      <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2 font-semibold">
                        <Link href={`/admin/students/${student.id}`} className="hover:text-primary">
                          {student.name}
                        </Link>
                      </td>
                      {statuses.map((status, i) => (
                        <td key={monthDays[i]} className="px-1 py-1.5 text-center">
                          {status && (
                            <span
                              title={t.attendance.statuses[status]}
                              className={`inline-flex min-w-7 justify-center rounded-md px-1 py-0.5 text-xs font-extrabold ${cellClass[ATTENDANCE_TONES[status]]}`}
                            >
                              {t.attendance.short[status]}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{marked ? `${Math.round((attended / marked) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
