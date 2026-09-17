"use client";

import { Bot, Check, Undo2 } from "lucide-react";
import { format } from "@/i18n/config";
import type { AiReport } from "@/lib/ai/review";
import { useActionState, useState } from "react";
import { Field, FormAlert } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { FormAction } from "@/lib/action-state";

type ReviewFormProps = {
  t: Dictionary;
  maxScore: number;
  defaults: { score: number | null; comment: string | null };
  action: FormAction;
  /** Student feedback written by the AI, can be inserted into the comment and edited */
  aiFeedback?: AiReport["feedback"] | null;
};

export function ReviewForm({ t, maxScore, defaults, action, aiFeedback }: ReviewFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  // Controlled so an error doesn't wipe what the teacher typed
  const [score, setScore] = useState(defaults.score === null ? "" : String(defaults.score));
  const [comment, setComment] = useState(defaults.comment ?? "");

  return (
    <form action={formAction} className="space-y-4">
      <Field
        name="score"
        type="number"
        inputMode="numeric"
        min={0}
        max={maxScore}
        label={`${t.submissions.score} (0–${maxScore})`}
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">{t.submissions.comment}</span>
        <textarea
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.submissions.commentPlaceholder}
          maxLength={5000}
          className="input min-h-28 resize-y"
        />
      </label>

      {aiFeedback && (
        <div className="flex flex-wrap gap-2">
          {(["uz", "ru"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              className="btn border border-border bg-surface px-2.5 py-1 text-xs"
              onClick={() => {
                const { positives, improvements } = aiFeedback[lang];
                const text = [positives, ...improvements.map((item) => `• ${item}`)].filter(Boolean).join("\n");
                setComment((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
              }}
            >
              <Bot size={14} />
              {format(t.ai.insertFeedback, { lang: lang.toUpperCase() })}
            </button>
          ))}
        </div>
      )}

      {state && !state.ok && <FormAlert ok={false} message={state.message} />}

      <div className="grid gap-2 sm:grid-cols-2">
        <SubmitButton name="decision" value="ACCEPTED" className="btn bg-success text-white hover:bg-success/90">
          <Check size={18} />
          {t.submissions.accept}
        </SubmitButton>
        <SubmitButton name="decision" value="RETURNED" className="btn border border-danger/40 bg-surface text-danger hover:bg-danger-soft">
          <Undo2 size={18} />
          {t.submissions.return}
        </SubmitButton>
      </div>
      <p className="text-xs text-muted">{t.submissions.nextAfterSave}</p>
    </form>
  );
}
