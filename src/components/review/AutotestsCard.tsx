"use client";

import { ClipboardCheck, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AutotestResults } from "@/components/autotests/AutotestResults";
import { useAutotestRunner } from "@/components/autotests/useAutotestRunner";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { AutotestResult, AutotestRule } from "@/lib/autotests";
import type { CodeFiles } from "@/lib/preview";

type AutotestsCardProps = {
  t: Dictionary;
  rules: AutotestRule[];
  code: CodeFiles;
  stored: AutotestResult[] | null;
  save: (results: AutotestResult[]) => Promise<void>;
};

/** Re-runs the autotests in the teacher's browser and stores them when they differ from the student's run. */
export function AutotestsCard({ t, rules, code, stored, save }: AutotestsCardProps) {
  const runAutotests = useAutotestRunner();
  const [results, setResults] = useState(stored);
  const [running, setRunning] = useState(true);
  const started = useRef(false);
  const latest = useRef({ code, rules, stored, save });

  const rerun = async () => {
    const { code: currentCode, rules: currentRules, stored: currentStored, save: persist } = latest.current;
    setRunning(true);
    const fresh = await runAutotests(currentCode, currentRules);
    setResults(fresh);
    setRunning(false);
    if (JSON.stringify(fresh) !== JSON.stringify(currentStored)) await persist(fresh);
  };

  useEffect(() => {
    latest.current = { code, rules, stored, save };
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { code: currentCode, rules: currentRules, stored: currentStored, save: persist } = latest.current;
    void runAutotests(currentCode, currentRules).then((fresh) => {
      setResults(fresh);
      setRunning(false);
      if (JSON.stringify(fresh) !== JSON.stringify(currentStored)) void persist(fresh);
    });
  }, [runAutotests]);

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <ClipboardCheck size={20} className="text-primary" />
          {t.autotests.title}
        </h2>
        <button type="button" onClick={rerun} disabled={running} className="btn btn-ghost px-2 py-1 text-xs">
          {running ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          {running ? t.autotests.checking : t.autotests.rerun}
        </button>
      </div>
      <AutotestResults t={t} rules={rules} results={results} />
    </section>
  );
}
