"use client";

import { AlertCircle, ArrowDown, ArrowLeft, CalendarClock, Loader2, PenLine, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { AiFeedback, SaveIndicator, SubmissionBanner, type SaveStatus, type WorkspaceSubmission } from "./Workspace";

type TextWorkspaceProps = {
  t: Dictionary;
  title: string;
  lessonTitle: string;
  backHref: string;
  due: { label: string; overdue: boolean } | null;
  maxScore: number;
  /** The answer outline the student starts from */
  template: string;
  initialAnswer: string;
  submission: WorkspaceSubmission | null;
  saveDraft: (answer: string) => Promise<{ ok: boolean; locked?: boolean }>;
  submitAnswer: (answer: string) => Promise<{ ok: boolean; message?: string }>;
  description: ReactNode;
};

const AUTOSAVE_DELAY = 1500;

/** A TEXT task (AI course): the task on top, the written answer below, autosaved like code. */
export function TextWorkspace({
  t,
  title,
  lessonTitle,
  backHref,
  due,
  maxScore,
  template,
  initialAnswer,
  submission,
  saveDraft,
  submitAnswer,
  description,
}: TextWorkspaceProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState(initialAnswer);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastSaved = useRef(initialAnswer);
  const ta = t.textAnswer;

  const locked = submission !== null && submission.status !== "RETURNED";

  // Autosave a moment after the student stops typing
  useEffect(() => {
    if (locked || answer === lastSaved.current) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const result = await saveDraft(answer);
        if (!result.ok) throw new Error("save failed");
        lastSaved.current = answer;
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [answer, locked, saveDraft]);

  useEffect(() => {
    if (saveStatus === "saved" || locked) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus, locked]);

  const change = (value: string) => {
    if (locked) return;
    setAnswer(value);
    setSaveStatus(value === lastSaved.current ? "saved" : "unsaved");
  };

  const reset = () => {
    if (!window.confirm(ta.resetConfirm)) return;
    change(template);
  };

  const submit = async () => {
    if (!window.confirm(t.submissions.submitConfirm)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitAnswer(answer);
      if (result.ok) {
        lastSaved.current = answer;
        setSaveStatus("saved");
        router.refresh();
      } else {
        setSubmitError(result.message ?? t.submissions.submitError);
      }
    } catch {
      setSubmitError(t.submissions.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-2 backdrop-blur sm:px-3">
        <Link href={backHref} className="btn btn-ghost p-2" aria-label={t.common.back} title={t.common.back}>
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{lessonTitle}</p>
          <h1 className="truncate font-extrabold leading-tight">{title}</h1>
        </div>
        {due && (
          <span
            className={`hidden items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold md:flex ${
              due.overdue ? "bg-danger-soft text-danger" : "bg-background text-muted"
            }`}
          >
            <CalendarClock size={14} />
            {due.label}
          </span>
        )}
        <a href="#answer" className="btn btn-ghost px-2 py-2 text-sm" title={ta.goToAnswer}>
          <ArrowDown size={16} />
          <span className="hidden lg:inline">{ta.goToAnswer}</span>
        </a>
        {!locked && (
          <>
            <SaveIndicator status={saveStatus} t={t} />
            {template && (
              <button type="button" onClick={reset} className="btn btn-ghost p-2" title={ta.reset} aria-label={ta.reset}>
                <RotateCcw size={18} />
              </button>
            )}
            <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary px-3 py-2 text-sm">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">{submission?.status === "RETURNED" ? t.submissions.resubmit : t.submissions.submit}</span>
            </button>
          </>
        )}
      </header>

      {submitError && (
        <p role="alert" className="flex items-center gap-2 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger">
          <AlertCircle size={16} />
          {submitError}
        </p>
      )}

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-8">
        {submission && <SubmissionBanner submission={submission} maxScore={maxScore} t={t} reviewText={ta.bannerReview} />}
        {submission?.ai && <AiFeedback ai={submission.ai} t={t} />}
        {due && (
          <p className={`flex items-center gap-1.5 text-sm font-bold md:hidden ${due.overdue ? "text-danger" : "text-muted"}`}>
            <CalendarClock size={16} />
            {due.label}
          </p>
        )}
        <section className="card">{description}</section>

        <section id="answer" className="scroll-mt-16 space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <PenLine size={20} className="text-primary" />
            {ta.yourAnswer}
          </h2>
          <p className="text-sm text-muted">{ta.hint}</p>
          <textarea
            value={answer}
            onChange={(e) => change(e.target.value)}
            readOnly={locked}
            placeholder={ta.placeholder}
            maxLength={30_000}
            className="input min-h-[60vh] w-full resize-y font-sans leading-relaxed"
          />
          <p className="text-right text-xs text-muted">{answer.length} / 30 000</p>
        </section>
      </div>
    </div>
  );
}
