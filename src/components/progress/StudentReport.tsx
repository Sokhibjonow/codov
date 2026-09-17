import { AlarmClock, BookOpen, CalendarCheck, ClipboardCheck, MessageSquareText, Star } from "lucide-react";
import { AssignmentStatusBadge } from "@/components/learn/AssignmentStatusBadge";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { format, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { formatDateTime, formatDay } from "@/lib/format";
import { pick } from "@/lib/learning";
import type { StudentReport as Report } from "@/lib/progress";

export const ATTENDANCE_TONES = { PRESENT: "success", LATE: "accent", ABSENT: "danger", EXCUSED: "neutral" } as const;

const RECENT_ATTENDANCE = 30;

export function StudentReport({ t, locale, report }: { t: Dictionary; locale: Locale; report: Report }) {
  const tp = t.progress;
  const s = report.summary;

  const tiles = [
    { label: tp.lessons, value: s.lessonsTotal ? format(tp.lessonsValue, { done: s.lessonsDone, total: s.lessonsTotal }) : "—", icon: BookOpen, warn: false },
    { label: tp.averageScore, value: s.averageScore !== null ? `${s.averageScore}%` : "—", icon: Star, warn: s.averageScore !== null && s.averageScore < 60 },
    { label: tp.attendance, value: s.attendanceRate !== null ? `${s.attendanceRate}%` : "—", icon: CalendarCheck, warn: s.attendanceRate !== null && s.attendanceRate < 80 },
    { label: tp.accepted, value: `${s.accepted} / ${s.assignmentsTotal}`, icon: ClipboardCheck, warn: false },
    { label: tp.overdue, value: String(s.overdue), icon: AlarmClock, warn: s.overdue > 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        {tiles.map(({ label, value, icon: Icon, warn }) => (
          <div key={label} className={`card ${warn ? "border-danger/40 bg-danger-soft/40" : ""}`}>
            <Icon size={20} className={warn ? "text-danger" : "text-primary"} />
            <p className="mt-2 text-2xl font-extrabold">{value}</p>
            <p className="text-xs font-semibold text-muted">{label}</p>
          </div>
        ))}
      </div>

      {report.courses.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-extrabold">{tp.courses}</h2>
          {report.courses.map((course) => (
            <div key={course.id}>
              <p className="mb-1 font-bold">{pick(locale, course.titleUz, course.titleRu)}</p>
              <ProgressBar
                done={course.done}
                total={course.total}
                label={format(tp.lessonsValue, { done: course.done, total: course.total })}
              />
            </div>
          ))}
        </section>
      )}

      <section className="card p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-lg font-extrabold">{tp.assignments}</h2>
          {s.inReview > 0 && <Badge tone="accent">{format(tp.inReview, { n: s.inReview })}</Badge>}
          {s.returned > 0 && <Badge tone="danger">{format(tp.returned, { n: s.returned })}</Badge>}
        </div>
        {report.assignments.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">{tp.noAssignments}</p>
        ) : (
          <ul className="divide-y divide-border">
            {report.assignments.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{pick(locale, a.titleUz, a.titleRu)}</p>
                    <p className="truncate text-xs text-muted">
                      {pick(locale, a.courseUz, a.courseRu)} · {pick(locale, a.lessonUz, a.lessonRu)}
                    </p>
                  </div>
                  {a.score !== null && (
                    <span className="text-sm font-extrabold text-success">{format(tp.score, { score: a.score, max: a.maxScore })}</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <AssignmentStatusBadge status={a.status} t={t} />
                  {a.overdue && a.dueAt && <Badge tone="danger">{tp.overdue} · {formatDateTime(a.dueAt, locale)}</Badge>}
                  {!a.overdue && a.dueAt && a.status !== "ACCEPTED" && (
                    <span className="text-muted">{format(tp.due, { date: formatDateTime(a.dueAt, locale) })}</span>
                  )}
                  {a.late && <Badge tone="accent">{tp.late}</Badge>}
                  {a.attempts > 1 && <span className="text-muted">{format(tp.attempts, { n: a.attempts })}</span>}
                </div>
                {a.teacherComment && (
                  <div className="mt-2 flex gap-2 rounded-lg bg-background px-3 py-2 text-sm">
                    <MessageSquareText size={16} className="mt-0.5 shrink-0 text-primary" />
                    <p className="min-w-0 whitespace-pre-wrap break-words">
                      <span className="block text-xs font-bold text-muted">{tp.teacherComment}</span>
                      {a.teacherComment}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-extrabold">{tp.recentAttendance}</h2>
          {report.attendance.length > 0 && (
            <p className="text-xs text-muted">
              {format(tp.attendanceCounts, {
                present: s.attendanceCounts.PRESENT,
                late: s.attendanceCounts.LATE,
                absent: s.attendanceCounts.ABSENT,
                excused: s.attendanceCounts.EXCUSED,
              })}
            </p>
          )}
        </div>
        {report.attendance.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">{tp.noAttendance}</p>
        ) : (
          <ul className="divide-y divide-border">
            {report.attendance.slice(0, RECENT_ATTENDANCE).map((record) => (
              <li key={`${record.date}-${record.groupName}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="inline-block w-40 font-semibold first-letter:uppercase">{formatDay(record.date, locale)}</span>
                <Badge tone={ATTENDANCE_TONES[record.status]}>{t.attendance.statuses[record.status]}</Badge>
                <span className="text-xs text-muted">{record.groupName}</span>
                {record.note && <span className="w-full text-xs text-muted sm:w-auto">— {record.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
