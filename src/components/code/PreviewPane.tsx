"use client";

import { ChevronDown, ChevronUp, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { buildPreviewDocument, type CodeFiles, type PreviewMessage } from "@/lib/preview";

type LogEntry = { id: number; level: PreviewMessage["level"]; text: string };

const MAX_LOGS = 200;

const levelClass: Record<LogEntry["level"], string> = {
  log: "text-[#e6edf3]",
  info: "text-[#79c0ff]",
  warn: "text-[#e3b341] bg-[#e3b341]/10",
  error: "text-[#ff7b72] bg-[#ff7b72]/10",
};

function isPreviewMessage(data: unknown): data is PreviewMessage {
  return typeof data === "object" && data !== null && (data as PreviewMessage).__cubick === true;
}

export function PreviewPane({ code, t, className = "" }: { code: CodeFiles; t: Dictionary; className?: string }) {
  const [autoRun, setAutoRun] = useState(true);
  // Starts empty: an iframe rendered on the server would run before our message listener exists
  const [doc, setDoc] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(true);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const docRef = useRef(doc);
  const nextLogId = useRef(0);

  const run = useCallback(
    (force: boolean) => {
      const next = buildPreviewDocument(code);
      if (!force && next === docRef.current) return;
      docRef.current = next;
      setLogs([]);
      setDoc(next);
      setRunId((n) => n + 1);
    },
    [code],
  );

  useEffect(() => {
    if (!autoRun && docRef.current !== null) return;
    const timer = setTimeout(() => run(false), docRef.current === null ? 0 : 700);
    return () => clearTimeout(timer);
  }, [autoRun, run]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only accept messages from our own preview frame
      if (event.source !== frameRef.current?.contentWindow || !isPreviewMessage(event.data)) return;
      const { level, args } = event.data;
      setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), { id: nextLogId.current++, level, text: args.join(" ") }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <div className={`flex min-h-0 flex-col bg-surface ${className}`}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="flex-1 text-sm font-extrabold">{t.assignments.preview}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted">
          <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} className="accent-primary" />
          {t.assignments.autoRun}
        </label>
        <button type="button" onClick={() => run(true)} className="btn btn-primary px-2.5 py-1 text-xs">
          <Play size={14} />
          {t.assignments.run}
        </button>
      </div>

      {doc === null ? (
        <div className="min-h-0 flex-1 bg-white" />
      ) : (
        <iframe
          key={runId}
          ref={frameRef}
          title={t.assignments.preview}
          srcDoc={doc}
          // No allow-same-origin: student code can't reach the platform's cookies or pages
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          className="min-h-0 w-full flex-1 bg-white"
        />
      )}

      <div className="flex shrink-0 flex-col border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex h-9 items-center gap-2 px-3 text-xs">
          <button
            type="button"
            onClick={() => setConsoleOpen((v) => !v)}
            className="flex flex-1 items-center gap-2 font-bold text-[#e6edf3]"
            aria-expanded={consoleOpen}
          >
            {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {t.assignments.console}
            {logs.length > 0 && (
              <span className={`rounded px-1.5 font-mono ${errorCount ? "bg-[#ff7b72] text-[#0d1117]" : "bg-[#30363d] text-[#e6edf3]"}`}>
                {logs.length}
              </span>
            )}
          </button>
          {logs.length > 0 && (
            <button type="button" onClick={() => setLogs([])} className="flex items-center gap-1 text-[#8b949e] hover:text-white">
              <Trash2 size={13} />
              {t.assignments.clearConsole}
            </button>
          )}
        </div>
        {consoleOpen && (
          <div className="h-32 overflow-y-auto border-t border-[#30363d] font-mono text-xs" aria-live="polite">
            {logs.length === 0 ? (
              <p className="px-3 py-2 text-[#8b949e]">{t.assignments.noConsole}</p>
            ) : (
              logs.map((entry) => (
                <pre key={entry.id} className={`whitespace-pre-wrap break-all border-b border-[#30363d]/60 px-3 py-1 ${levelClass[entry.level]}`}>
                  {entry.text}
                </pre>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
