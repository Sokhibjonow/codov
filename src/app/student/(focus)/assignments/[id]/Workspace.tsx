"use client";

import { AlertCircle, ArrowDown, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, Code2, Hourglass, Loader2, RotateCcw, Send, Undo2, X } from "lucide-react";
import { AutotestResults } from "@/components/autotests/AutotestResults";
import { useAutotestRunner } from "@/components/autotests/useAutotestRunner";
import type { AutotestResult, AutotestRule } from "@/lib/autotests";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CodeTabsEditor } from "@/components/code/CodeTabsEditor";
import { PreviewPane } from "@/components/code/PreviewPane";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ReplaySegment } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";
import { useIntegrityRecorder } from "./useIntegrityRecorder";

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export type WorkspaceSubmission = {
  status: "SUBMITTED" | "NEEDS_REVIEW" | "ACCEPTED" | "RETURNED";
  score: number | null;
  comment: string | null;
};

type WorkspaceProps = {
  t: Dictionary;
  title: string;
  lessonTitle: string;
  backHref: string;
  due: { label: string; overdue: boolean } | null;
  maxScore: number;
  starter: CodeFiles;
  initialCode: CodeFiles;
  submission: WorkspaceSubmission | null;
  tests: AutotestRule[];
  saveDraft: (code: CodeFiles, segment: ReplaySegment | null) => Promise<{ ok: boolean; locked?: boolean }>;
  submitWork: (
    code: CodeFiles,
    segment: ReplaySegment | null,
    autotestResults: AutotestResult[] | null,
  ) => Promise<{ ok: boolean; message?: string }>;
  description: ReactNode;
};

const AUTOSAVE_DELAY = 1500;

/**
 * The task (with the full-size result the student has to build) on top,
 * the student's own editor and preview below it.
 */
export function Workspace({
  t,
  title,
  lessonTitle,
  backHref,
  due,
  maxScore,
  starter,
  initialCode,
  submission,
  tests,
  saveDraft,
  submitWork,
  description,
}: WorkspaceProps) {
  const runAutotests = useAutotestRunner();
  const [testResults, setTestResults] = useState<AutotestResult[] | null>(null);
  const [testsOpen, setTestsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const router = useRouter();
  const [code, setCode] = useState<CodeFiles>(initialCode);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastSaved = useRef(JSON.stringify(initialCode));
  const recorder = useIntegrityRecorder(initialCode);

  const locked = submission !== null && submission.status !== "RETURNED";

  // Autosave a moment after the student stops typing
  useEffect(() => {
    const snapshot = JSON.stringify(code);
    if (locked || snapshot === lastSaved.current) return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const result = await saveDraft(code, recorder.snapshot());
        if (!result.ok) throw new Error("save failed");
        lastSaved.current = snapshot;
        setSaveStatus(JSON.stringify(code) === snapshot ? "saved" : "unsaved");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [code, locked, saveDraft, recorder]);

  useEffect(() => {
    if (saveStatus === "saved" || locked) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus, locked]);

  const updateFile = (file: keyof CodeFiles, value: string) => {
    if (locked) return;
    setCode((prev) => (prev[file] === value ? prev : { ...prev, [file]: value }));
    if (value !== code[file]) setSaveStatus("unsaved");
  };

  const reset = () => {
    if (!window.confirm(t.assignments.resetConfirm)) return;
    setCode(starter);
    setSaveStatus("unsaved");
  };

  const checkTests = async () => {
    setTesting(true);
    setTestsOpen(true);
    try {
      setTestResults(await runAutotests(code, tests));
    } finally {
      setTesting(false);
    }
  };

  const submit = async () => {
    if (!window.confirm(t.submissions.submitConfirm)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const autotestResults = tests.length > 0 ? await runAutotests(code, tests) : null;
      if (autotestResults) setTestResults(autotestResults);
      const result = await submitWork(code, recorder.snapshot(), autotestResults);
      if (result.ok) {
        lastSaved.current = JSON.stringify(code);
        setSaveStatus("saved");
        recorder.restart(code);
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
        <a href="#workspace" className="btn btn-ghost px-2 py-2 text-sm" title={t.assignments.goToCode}>
          <ArrowDown size={16} />
          <span className="hidden lg:inline">{t.assignments.goToCode}</span>
        </a>
        {!locked && (
          <>
            <SaveIndicator status={saveStatus} t={t} />
            <button type="button" onClick={reset} className="btn btn-ghost p-2" title={t.assignments.reset} aria-label={t.assignments.reset}>
              <RotateCcw size={18} />
            </button>
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

      {/* The task: full width so the expected result is shown at real size */}
      <section className="task-view border-b border-border bg-surface px-4 py-6 md:px-8">
        <div className="space-y-4">
          {submission && <SubmissionBanner submission={submission} maxScore={maxScore} t={t} />}
          {due && (
            <p className={`flex items-center gap-1.5 text-sm font-bold md:hidden ${due.overdue ? "text-danger" : "text-muted"}`}>
              <CalendarClock size={16} />
              {due.label}
            </p>
          )}
          {description}
          {tests.length > 0 && (
            <section className="card">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <ClipboardCheck size={20} className="text-primary" />
                {t.autotests.title}
              </h2>
              <p className="mb-3 mt-1 text-sm text-muted">{t.autotests.studentHint}</p>
              <AutotestResults t={t} rules={tests} results={null} />
            </section>
          )}
        </div>
      </section>

      {/* The student's own work */}
      <section id="workspace" className="scroll-mt-14">
        <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-extrabold">
            <Code2 size={16} className="text-primary" />
            {t.assignments.yourSolution}
          </h2>
          {tests.length > 0 && (
            <button type="button" onClick={checkTests} disabled={testing} className="btn border border-border bg-surface px-2.5 py-1 text-xs">
              {testing ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              {testing ? t.autotests.checking : `${t.autotests.check} (${tests.length})`}
            </button>
          )}
        </div>
        {testsOpen && (testResults || testing) && (
          <div className="relative max-h-72 overflow-y-auto border-b border-border bg-surface px-4 py-3">
            <button
              type="button"
              onClick={() => setTestsOpen(false)}
              className="btn btn-ghost absolute right-2 top-2 p-1.5"
              aria-label={t.common.close}
            >
              <X size={16} />
            </button>
            <AutotestResults t={t} rules={tests} results={testResults} />
          </div>
        )}
        <div className="grid lg:h-[calc(100dvh-6rem)] lg:grid-cols-2">
          <div className="flex h-[70vh] min-h-0 flex-col border-b border-border lg:h-auto lg:border-b-0 lg:border-r">
            <CodeTabsEditor code={code} onChange={updateFile} readOnly={locked} onEdit={recorder.record} className="min-h-0 flex-1" />
          </div>
          <div className="flex h-[70vh] min-h-0 flex-col lg:h-auto">
            <PreviewPane code={code} t={t} className="min-h-0 flex-1" />
          </div>
        </div>
      </section>
    </div>
  );
}

function SubmissionBanner({ submission, maxScore, t }: { submission: WorkspaceSubmission; maxScore: number; t: Dictionary }) {
  const view = {
    SUBMITTED: { icon: Hourglass, className: "bg-accent/15 text-[#92400e]", text: t.submissions.banner.review },
    NEEDS_REVIEW: { icon: Hourglass, className: "bg-accent/15 text-[#92400e]", text: t.submissions.banner.review },
    ACCEPTED: {
      icon: CheckCircle2,
      className: "bg-success/10 text-success",
      text: format(t.submissions.banner.accepted, { score: submission.score ?? "—", max: maxScore }),
    },
    RETURNED: { icon: Undo2, className: "bg-danger-soft text-danger", text: t.submissions.banner.returned },
  }[submission.status];
  const Icon = view.icon;

  return (
    <div className={`rounded-xl px-4 py-3 ${view.className}`}>
      <p className="flex items-start gap-2 font-bold">
        <Icon size={18} className="mt-0.5 shrink-0" />
        {view.text}
      </p>
      {submission.comment && (
        <div className="mt-2 rounded-lg bg-surface/70 px-3 py-2 text-sm text-foreground">
          <p className="mb-1 text-xs font-bold text-muted">{t.submissions.banner.teacherComment}</p>
          <p className="whitespace-pre-wrap">{submission.comment}</p>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status, t }: { status: SaveStatus; t: Dictionary }) {
  const content = {
    saved: { icon: <CheckCircle2 size={16} className="text-success" />, label: t.assignments.saved, className: "text-muted" },
    unsaved: { icon: <span className="size-2 rounded-full bg-accent" />, label: t.assignments.unsaved, className: "text-muted" },
    saving: { icon: <Loader2 size={16} className="animate-spin" />, label: t.assignments.saving, className: "text-muted" },
    error: { icon: <AlertCircle size={16} />, label: t.assignments.saveError, className: "text-danger" },
  }[status];

  return (
    <span className={`flex items-center gap-1.5 text-xs font-semibold ${content.className}`} role="status">
      {content.icon}
      <span className={status === "error" ? "hidden sm:inline" : "hidden xl:inline"}>{content.label}</span>
    </span>
  );
}
