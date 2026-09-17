"use client";

import { useCallback } from "react";
import { buildTestDocument, type RunnerMessage } from "@/lib/autotest-runner";
import { parseResults, runCodeRules, type AutotestResult, type AutotestRule } from "@/lib/autotests";
import type { CodeFiles } from "@/lib/preview";

const TIMEOUT_MS = 10_000;

/** Runs autotests in a hidden sandboxed frame (no access to the site) and returns one result per rule. */
export function useAutotestRunner() {
  return useCallback((code: CodeFiles, rules: AutotestRule[]): Promise<AutotestResult[]> => {
    const codeResults = runCodeRules(rules, code);
    const merge = (browserResults: unknown) => {
      const browser = parseResults(browserResults, rules);
      return rules.map((rule, index) =>
        rule.type === "code"
          ? codeResults.find((r) => r.id === rule.id)!
          : browser[index].reason === "error" && browserResults === null
            ? { id: rule.id, passed: false, reason: "timeout" as const }
            : browser[index],
      );
    };

    if (rules.every((rule) => rule.type === "code")) return Promise.resolve(merge([]));

    return new Promise((resolve) => {
      const runId = Math.random().toString(36).slice(2);
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "1280px", height: "800px", border: "0" });

      let finished = false;
      const finish = (results: unknown) => {
        if (finished) return;
        finished = true;
        window.removeEventListener("message", onMessage);
        clearTimeout(timer);
        frame.remove();
        resolve(merge(results));
      };
      const onMessage = (event: MessageEvent) => {
        const data = event.data as Partial<RunnerMessage> | null;
        if (event.source === frame.contentWindow && data?.__cubickTests && data.runId === runId) finish(data.results);
      };

      window.addEventListener("message", onMessage);
      // An infinite loop in the student's code never answers
      const timer = setTimeout(() => finish(null), TIMEOUT_MS);
      frame.srcdoc = buildTestDocument(code, rules, runId);
      document.body.appendChild(frame);
    });
  }, []);
}
