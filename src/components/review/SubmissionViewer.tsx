"use client";

import { Code2, FileText, History, MonitorPlay } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CodeTabsEditor } from "@/components/code/CodeTabsEditor";
import { PreviewPane } from "@/components/code/PreviewPane";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ReplaySegment } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";
import { ReplayPlayer } from "./ReplayPlayer";

type Tab = "code" | "result" | "replay" | "task";

export function SubmissionViewer({ t, code, segments, task }: { t: Dictionary; code: CodeFiles; segments: ReplaySegment[]; task: ReactNode }) {
  const [tab, setTab] = useState<Tab>("result");

  const tabs = [
    { key: "result", label: t.submissions.result, icon: MonitorPlay },
    { key: "code", label: t.submissions.code, icon: Code2 },
    { key: "replay", label: t.submissions.replay, icon: History },
    { key: "task", label: t.submissions.task, icon: FileText },
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
      </div>
    </div>
  );
}
