import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { IntegrityFlag, IntegritySummary } from "@/lib/integrity";

const severe = new Set<IntegrityFlag>(["mostlyPasted", "replayMismatch", "tooFast"]);

export function IntegrityCard({ summary, t }: { summary: IntegritySummary | null; t: Dictionary }) {
  const ti = t.integrity;
  const minutes = (seconds: number) => format(ti.minutes, { n: Math.round(seconds / 60) });

  const rows = summary
    ? [
        [ti.typed, format(ti.chars, { n: summary.typed })],
        [ti.pasted, format(ti.chars, { n: summary.pasted })],
        [ti.snippets, format(ti.chars, { n: summary.snippets ?? 0 })],
        [ti.pasteShare, `${Math.round(summary.pasteShare * 100)}%`],
        [ti.pasteCount, String(summary.pasteCount)],
        [ti.largestPaste, format(ti.chars, { n: summary.largestPaste })],
        [ti.activeTime, minutes(summary.activeSeconds)],
        [ti.tabSwitches, format(ti.times, { n: summary.blurCount })],
        [ti.awayTime, minutes(summary.awaySeconds)],
        [ti.sessions, String(summary.sessions)],
      ]
    : [];

  const flagged = (summary?.flags ?? []).some((f) => severe.has(f));

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          {flagged ? <ShieldAlert size={20} className="text-danger" /> : <ShieldCheck size={20} className="text-success" />}
          {ti.title}
        </h2>
        <p className="mt-1 text-xs text-muted">{ti.hint}</p>
      </div>

      {summary && summary.pasted + summary.typed > 0 && (
        <div className="flex h-2.5 overflow-hidden rounded-full bg-background" aria-hidden="true">
          <div className="bg-success" style={{ width: `${(1 - summary.pasteShare) * 100}%` }} />
          <div className="bg-danger" style={{ width: `${summary.pasteShare * 100}%` }} />
        </div>
      )}

      {summary?.flags.length ? (
        <ul className="space-y-1.5">
          {summary.flags.map((flag) => (
            <li
              key={flag}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                severe.has(flag) ? "bg-danger-soft text-danger" : "bg-accent/15 text-warning-strong"
              }`}
            >
              {ti.flags[flag]}
            </li>
          ))}
        </ul>
      ) : (
        summary && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-bold text-success">
            <CheckCircle2 size={16} />
            {ti.ok}
          </p>
        )
      )}

      {summary ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">{ti.flags.noActivity}</p>
      )}
    </section>
  );
}
