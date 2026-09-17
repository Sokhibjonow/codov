"use client";

import { AlertCircle, Bot, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { AiReport } from "@/lib/ai/review";

type AiStatus = "NONE" | "QUEUED" | "RUNNING" | "DONE" | "FAILED";

type AiReviewCardProps = {
  t: Dictionary;
  status: AiStatus;
  report: AiReport | null;
  error: string | null;
  configured: boolean;
  enabled: boolean;
  requeue: () => Promise<void>;
};

const verdictTone = { PASSED: "success", NEEDS_REVIEW: "accent", SUSPECTED_AI: "danger" } as const;

function Meter({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-success" : value >= 40 ? "bg-accent" : "bg-danger";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold">
        <span className="text-muted">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function AiReviewCard({ t, status, report, error, configured, enabled, requeue }: AiReviewCardProps) {
  const router = useRouter();
  const ta = t.ai;
  const pending = status === "QUEUED" || status === "RUNNING";

  // Picks up the result as soon as the background review finishes
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [pending, router]);

  const runButton = (label: string) =>
    configured && (
      <form action={requeue}>
        <SubmitButton className="btn border border-border bg-surface px-3 py-1.5 text-xs">
          <RotateCcw size={14} />
          {label}
        </SubmitButton>
      </form>
    );

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Bot size={20} className="text-primary" />
          {ta.title}
        </h2>
        <p className="mt-1 text-xs text-muted">{ta.disclaimer}</p>
      </div>

      {!configured && <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted">{ta.noKey}</p>}

      {configured && status === "NONE" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{enabled ? "" : ta.disabled}</p>
          {runButton(ta.run)}
        </div>
      )}

      {pending && (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-bold text-primary">
            <Loader2 size={16} className="animate-spin" />
            {status === "RUNNING" ? ta.running : ta.queued}
          </p>
          {error && <p className="text-xs text-muted">{ta.quotaWait}</p>}
        </div>
      )}

      {status === "FAILED" && (
        <div className="space-y-2">
          <p className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              {ta.failed}
              {error && <span className="block break-words text-xs font-normal">{error}</span>}
            </span>
          </p>
          {runButton(ta.retry)}
        </div>
      )}

      {status === "DONE" && report && (
        <div className="space-y-4">
          <Badge tone={verdictTone[report.verdict]}>{ta.verdict[report.verdict]}</Badge>
          <div className="space-y-2.5">
            <Meter label={ta.completion} value={report.taskCompletionScore} />
            <Meter label={ta.manual} value={report.manualCodeProbability} />
          </div>

          <div>
            <h3 className="mb-1 text-xs font-extrabold uppercase text-muted">{ta.summary}</h3>
            <p className="whitespace-pre-wrap text-sm">{report.summary}</p>
          </div>

          {report.errors.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-extrabold uppercase text-muted">{ta.errors}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {report.errors.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {report.aiReasons.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-extrabold uppercase text-danger">{ta.aiReasons}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {report.aiReasons.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="rounded-xl border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm font-bold">{ta.feedback}</summary>
            <div className="mt-2 space-y-3 text-sm">
              {(["ru", "uz"] as const).map((lang) => (
                <div key={lang}>
                  <p className="text-xs font-extrabold uppercase text-muted">{lang}</p>
                  <p className="mt-1">
                    <span className="font-bold">{ta.positives}: </span>
                    {report.feedback[lang].positives}
                  </p>
                  {report.feedback[lang].improvements.length > 0 && (
                    <>
                      <p className="mt-1 font-bold">{ta.improvements}:</p>
                      <ul className="list-disc pl-5">
                        {report.feedback[lang].improvements.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          </details>

          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{report.model}</span>
            {runButton(ta.retry)}
          </div>
        </div>
      )}
    </section>
  );
}
