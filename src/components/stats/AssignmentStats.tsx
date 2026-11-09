import { Code2, PenLine } from "lucide-react";
import Link from "next/link";
import { readAiReport } from "@/lib/ai/review";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/learning";

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

/**
 * Every task of the group's courses: how many students tried it, how many got it accepted, the teacher's
 * average score and the AI's average "task done" score. Shows which lessons are hard for the group.
 */
export async function AssignmentStats({ groupId, studentIds, t, locale }: { groupId: string; studentIds: string[]; t: Dictionary; locale: Locale }) {
  const ts = t.stats;
  const assignments = await prisma.assignment.findMany({
    where: { isPublished: true, lesson: { isPublished: true, module: { course: { groups: { some: { groupId } } } } } },
    orderBy: [{ lesson: { module: { course: { titleUz: "asc" } } } }, { lesson: { module: { order: "asc" } } }, { lesson: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      kind: true,
      maxScore: true,
      lesson: { select: { titleUz: true, titleRu: true } },
    },
  });
  if (assignments.length === 0) return null;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: { in: assignments.map((a) => a.id) }, studentId: { in: studentIds } },
    orderBy: { attempt: "desc" },
    select: { assignmentId: true, studentId: true, status: true, score: true, aiStatus: true, aiReport: true },
  });

  // The latest attempt of each student counts
  const latest = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    const key = `${s.assignmentId}:${s.studentId}`;
    if (!latest.has(key)) latest.set(key, s);
  }

  // Only tasks someone has sent: a group with several long courses would otherwise list hundreds of rows
  const rows = assignments.flatMap((a) => {
    const mine = [...latest.values()].filter((s) => s.assignmentId === a.id);
    if (mine.length === 0) return [];
    const accepted = mine.filter((s) => s.status === "ACCEPTED");
    return [{
      ...a,
      tried: mine.length,
      accepted: accepted.length,
      score: average(accepted.filter((s) => s.score !== null).map((s) => Math.round(((s.score ?? 0) / a.maxScore) * 100))),
      ai: average(mine.flatMap((s) => (s.aiStatus === "DONE" ? [readAiReport(s.aiReport)?.taskCompletionScore ?? null] : [])).filter((v): v is number => v !== null)),
    }];
  });
  if (rows.length === 0) return null;

  const percent = (value: number | null) => (value === null ? "—" : `${value}%`);
  const tone = (value: number | null) => (value === null ? "" : value < 60 ? "font-bold text-danger" : value < 80 ? "font-bold text-warning-strong" : "text-success");

  return (
    <section className="card mt-5 p-0">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-extrabold">{ts.tasksTitle}</h2>
        <p className="text-xs text-muted">{ts.tasksHint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-2">{ts.task}</th>
              <th className="px-3 py-2">{ts.tried}</th>
              <th className="px-3 py-2">{ts.accepted}</th>
              <th className="px-3 py-2">{ts.score}</th>
              <th className="px-3 py-2">{ts.aiScore}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = row.kind === "TEXT" ? PenLine : Code2;
              return (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/submissions?assignment=${row.id}&group=${groupId}&status=all`} className="flex items-start gap-2 hover:text-primary">
                      <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
                      <span>
                        <span className="block font-bold">{pick(locale, row.titleUz, row.titleRu)}</span>
                        <span className="block text-xs text-muted">{pick(locale, row.lesson.titleUz, row.lesson.titleRu)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.tried}/{studentIds.length}
                  </td>
                  <td className="px-3 py-2.5">{row.accepted}</td>
                  <td className={`px-3 py-2.5 ${tone(row.score)}`}>{percent(row.score)}</td>
                  <td className={`px-3 py-2.5 ${tone(row.ai)}`}>{percent(row.ai)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
