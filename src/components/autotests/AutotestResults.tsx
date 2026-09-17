import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { describeFailure, describeRule } from "@/lib/autotest-text";
import { autotestScore, type AutotestResult, type AutotestRule } from "@/lib/autotests";

type AutotestResultsProps = {
  t: Dictionary;
  rules: AutotestRule[];
  /** null = not run yet: the list only shows what will be checked */
  results: AutotestResult[] | null;
};

export function AutotestResults({ t, rules, results }: AutotestResultsProps) {
  const byId = new Map(results?.map((r) => [r.id, r]));
  const passed = results?.filter((r) => r.passed).length ?? 0;
  const score = results ? autotestScore(rules, results) : null;

  return (
    <div className="space-y-2">
      {results && (
        <p className={`text-sm font-extrabold ${score === 100 ? "text-success" : score !== null && score >= 50 ? "text-warning" : "text-danger"}`}>
          {format(t.autotests.summary, { passed, total: rules.length, percent: score ?? 0 })}
        </p>
      )}
      <ul className="space-y-1.5">
        {rules.map((rule) => {
          const result = byId.get(rule.id);
          const failure = result && !result.passed ? describeFailure(t, result) : "";
          return (
            <li key={rule.id} className="flex items-start gap-2 text-sm">
              {!result ? (
                <CircleDashed size={18} className="mt-0.5 shrink-0 text-muted" />
              ) : result.passed ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
              )}
              <span className="min-w-0 flex-1">
                <span className="break-words font-semibold">{describeRule(t, rule)}</span>
                {failure && <span className="block break-words text-xs text-danger">{failure}</span>}
              </span>
              {rule.points > 1 && <span className="shrink-0 text-xs font-bold text-muted">{rule.points}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
