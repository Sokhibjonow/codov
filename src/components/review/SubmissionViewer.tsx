"use client";

import { Code2, FileText, History, LockKeyhole, MonitorPlay } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CodeTabsEditor } from "@/components/code/CodeTabsEditor";
import { PreviewPane } from "@/components/code/PreviewPane";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ReplaySegment } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";
import { ReplayPlayer } from "./ReplayPlayer";

type Tab = "code" | "result" | "replay" | "task" | "solution";

type SubmissionViewerProps = {
  t: Dictionary;
  code: CodeFiles;
  segments: ReplaySegment[];
  task: ReactNode;
  /** The task's model answer — the review page is for teachers only */
  solution: CodeFiles;
};

export function SubmissionViewer({ t, code, segments, task, solution }: SubmissionViewerProps) {
  const [solutionView, setSolutionView] = useState<"code" | "result">("code");
  const hasSolution = Boolean(solution.html.trim() || solution.css.trim() || solution.js.trim());
  const [tab, setTab] = useState<Tab>("result");

  const tabs = [
    { key: "result", label: t.submissions.result, icon: MonitorPlay },
    { key: "code", label: t.submissions.code, icon: Code2 },
    { key: "replay", label: t.submissions.replay, icon: History },
    { key: "task", label: t.submissions.task, icon: FileText },
    { key: "solution", label: t.submissions.solution, icon: LockKeyhole },
  ] as const;

  return (
    <div className="card flex h-[75vh] min-h-[480px] flex-col overflow-hidden p-0">
      <div role="tablist" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 pt-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "result" && <PreviewPane code={code} t={t} className="h-full" />}
        {tab === "code" && <CodeTabsEditor code={code} readOnly className="h-full" />}
        {tab === "replay" && <ReplayPlayer segments={segments} t={t} />}
        {tab === "task" && <div className="h-full overflow-y-auto p-5">{task}</div>}
        {tab === "solution" &&
          (hasSolution ? (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 gap-2 border-b border-border px-3 py-2">
                {(["code", "result"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSolutionView(v)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${solutionView === v ? "bg-primary text-on-color" : "bg-background text-muted hover:text-foreground"}`}
                  >
                    {v === "code" ? t.submissions.code : t.submissions.result}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                {solutionView === "code" ? (
                  <CodeTabsEditor code={solution} readOnly className="h-full" />
                ) : (
                  <PreviewPane code={solution} t={t} className="h-full" />
                )}
              </div>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted">{t.assignments.noSolution}</p>
          ))}
      </div>
    </div>
  );
}
