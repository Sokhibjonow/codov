"use client";

import {
  Bold,
  Code,
  Eye,
  Heading2,
  ImageIcon,
  Italic,
  Lightbulb,
  Link2,
  List,
  Loader2,
  MonitorPlay,
  Pencil,
  Play,
  SquareCode,
  Video,
} from "lucide-react";
import { useDeferredValue, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { FormAlert } from "@/components/ui/Field";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { youtubeId } from "@/lib/attachments";
import { uploadFile } from "@/lib/upload-client";
import { looksLikeHtmlCode } from "./html-detect";
import { Markdown } from "./Markdown";

export type Lang = "uz" | "ru";
type TextEdit = { text: string; selStart: number; selEnd: number };

const LANGS: { value: Lang; label: string }[] = [
  { value: "uz", label: "O‘zbekcha" },
  { value: "ru", label: "Русский" },
];

const LIVE_SNIPPET = `\`\`\`html-live
<h1>Salom, dunyo!</h1>

<style>
  h1 { color: #141B2D; }
</style>
\`\`\``;

type BilingualMarkdownEditorProps = {
  t: Dictionary;
  value: Record<Lang, string>;
  onChange: (lang: Lang, text: string) => void;
  /** Form field names for the two textareas */
  names: Record<Lang, string>;
  heightClass?: string;
};

/** Markdown editor with UZ/RU tabs, a formatting toolbar, image upload and live preview. */
export function BilingualMarkdownEditor({
  t,
  value,
  onChange,
  names,
  heightClass = "h-[65vh]",
}: BilingualMarkdownEditorProps) {
  const [lang, setLang] = useState<Lang>(() => (value.uz || !value.ru ? "uz" : "ru"));
  const [mobileView, setMobileView] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const textareas = useRef<Record<Lang, HTMLTextAreaElement | null>>({ uz: null, ru: null });

  const preview = useDeferredValue(value[lang]);

  const applyEdit = (edit: (text: string, start: number, end: number) => TextEdit) => {
    const el = textareas.current[lang];
    if (!el) return;
    const { text, selStart, selEnd } = edit(el.value, el.selectionStart, el.selectionEnd);
    onChange(lang, text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (before: string, after: string, placeholder: string) =>
    applyEdit((text, start, end) => {
      const selected = text.slice(start, end) || placeholder;
      const from = start + before.length;
      return {
        text: text.slice(0, start) + before + selected + after + text.slice(end),
        selStart: from,
        selEnd: from + selected.length,
      };
    });

  /** Inserts a block on its own lines and selects `select` inside it (or puts the cursor after it). */
  const insertBlock = (snippet: string, select?: string) =>
    applyEdit((text, start, end) => {
      const before = text.slice(0, start);
      const after = text.slice(end);
      const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const trail = after.startsWith("\n") ? "" : "\n";
      const blockStart = before.length + lead.length;
      const offset = select ? snippet.indexOf(select) : snippet.length;
      return {
        text: before + lead + snippet + trail + after,
        selStart: blockStart + offset,
        selEnd: blockStart + offset + (select?.length ?? 0),
      };
    });

  const uploadAndInsert = async (file: File) => {
    setUploading(true);
    setUploadFailed(false);
    const response = await uploadFile(file, { purpose: "image" });
    setUploading(false);

    if (response.ok) insertBlock(`![${file.name.replace(/\.[^.]+$/, "")}](${response.url})`);
    else setUploadFailed(true);
  };

  // Pasted HTML becomes a rendered result, so the preview shows the page instead of raw tags
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!looksLikeHtmlCode(text)) return;

    const before = event.currentTarget.value.slice(0, event.currentTarget.selectionStart);
    const insideCodeBlock = (before.match(/^```/gm) ?? []).length % 2 === 1;
    if (insideCodeBlock) return;

    event.preventDefault();
    // Result only: students see the page, not the teacher's code
    insertBlock(`\`\`\`html-result\n${text.replace(/\s+$/, "")}\n\`\`\``);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      wrap("  ", "", "");
    }
  };

  const tb = t.lessons.toolbar;
  const ph = t.lessons.placeholders;
  const tools = [
    { id: "heading", icon: Heading2, label: tb.heading },
    { id: "bold", icon: Bold, label: tb.bold },
    { id: "italic", icon: Italic, label: tb.italic },
    { id: "code", icon: Code, label: tb.code },
    { id: "list", icon: List, label: tb.list },
    { id: "link", icon: Link2, label: tb.link },
    { id: "tip", icon: Lightbulb, label: tb.tip },
    { id: "codeBlock", icon: SquareCode, label: tb.codeBlock },
    { id: "liveExample", icon: Play, label: tb.liveExample },
    { id: "resultOnly", icon: MonitorPlay, label: tb.resultOnly },
    { id: "image", icon: ImageIcon, label: tb.image },
    { id: "youtube", icon: Video, label: tb.youtube },
  ] as const;

  const runTool = (id: (typeof tools)[number]["id"]) => {
    switch (id) {
      case "heading":
        return insertBlock(`## ${ph.heading}`, ph.heading);
      case "bold":
        return wrap("**", "**", ph.bold);
      case "italic":
        return wrap("_", "_", ph.italic);
      case "code":
        return wrap("`", "`", ph.code);
      case "list":
        return insertBlock(`- ${ph.list}\n- ${ph.list}`, ph.list);
      case "link":
        return wrap("[", "](https://)", ph.link);
      case "tip":
        return insertBlock(`> 💡 ${ph.tip}`, ph.tip);
      case "codeBlock":
        return insertBlock("```html\n<p>Salom!</p>\n```", "<p>Salom!</p>");
      case "liveExample":
        return insertBlock(LIVE_SNIPPET, "<h1>Salom, dunyo!</h1>");
      case "resultOnly":
        return insertBlock("```html-result\n<h1>Salom, dunyo!</h1>\n```", "<h1>Salom, dunyo!</h1>");
      case "image":
        return fileRef.current?.click();
      case "youtube": {
        const url = window.prompt(t.lessons.youtubePrompt)?.trim();
        if (!url) return;
        if (!youtubeId(url)) return window.alert(t.lessons.youtubeInvalid);
        // A link on its own line becomes an embedded player
        return insertBlock(url);
      }
    }
  };

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
      active ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"
    }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div role="tablist" className="inline-flex gap-1 rounded-xl bg-background p-1">
          {LANGS.map(({ value: code, label }) => (
            <button key={code} type="button" role="tab" aria-selected={lang === code} onClick={() => setLang(code)} className={tabClass(lang === code)}>
              {label}
              {!value[code].trim() && <span className="font-normal text-muted"> · {t.lessons.emptyLanguage}</span>}
            </button>
          ))}
        </div>
        <div className="inline-flex gap-1 rounded-xl bg-background p-1 md:hidden">
          <button type="button" onClick={() => setMobileView("write")} className={tabClass(mobileView === "write")} aria-label={t.lessons.write}>
            <Pencil size={16} />
          </button>
          <button type="button" onClick={() => setMobileView("preview")} className={tabClass(mobileView === "preview")} aria-label={t.lessons.preview}>
            <Eye size={16} />
          </button>
        </div>
      </div>

      <div className={`flex-wrap items-center gap-0.5 border-b border-border px-2 py-1 ${mobileView === "preview" ? "hidden md:flex" : "flex"}`}>
        {tools.map(({ id, icon: Icon, label }) => (
          <button key={id} type="button" onClick={() => runTool(id)} title={label} aria-label={label} className="btn btn-ghost p-2">
            <Icon size={18} />
          </button>
        ))}
        {uploading && (
          <span className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted">
            <Loader2 size={14} className="animate-spin" />
            {t.lessons.uploading}
          </span>
        )}
      </div>
      {uploadFailed && (
        <div className="px-3 pt-3">
          <FormAlert ok={false} message={t.lessons.uploadFailed} />
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadAndInsert(file);
        }}
      />

      <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
        <div className={mobileView === "preview" ? "hidden md:block" : undefined}>
          {LANGS.map(({ value: code }) => (
            <textarea
              key={code}
              ref={(el) => {
                textareas.current[code] = el;
              }}
              name={names[code]}
              value={value[code]}
              hidden={lang !== code}
              onChange={(e) => onChange(code, e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              spellCheck={false}
              className={`block w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none ${heightClass}`}
            />
          ))}
        </div>
        <div className={`overflow-y-auto p-5 ${heightClass} ${mobileView === "write" ? "hidden md:block" : ""}`}>
          {preview.trim() ? (
            <Markdown content={preview} resultLabel={t.lessons.result} hiddenCodeNote={t.lessons.codeHidden} />
          ) : (
            <p className="text-muted">{t.lessons.emptyPreview}</p>
          )}
        </div>
      </div>
    </div>
  );
}
