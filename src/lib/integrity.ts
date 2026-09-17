import { z } from "zod";
import type { CodeFiles } from "./preview";

// Recording of how a student wrote the code, used by the teacher to judge independence.
// A session ("segment") starts every time the workspace is opened; its events replay from `base`.

export const FILE_KEYS = ["html", "css", "js"] as const;

/** t = typed, p = pasted/dropped, s = Emmet expansion, d = deleted, u = undo/redo, x = other (e.g. "reset to starter code") */
export type EventKind = "t" | "p" | "s" | "d" | "u" | "x";

/** One text replacement; a list of them applies one after another */
export type EditChange = { from: number; to: number; text: string };

/** [ms since session start, file index, from, to, inserted text, kind] — positions are sequentially applicable */
export type ReplayEvent = [t: number, file: 0 | 1 | 2, from: number, to: number, text: string, kind: EventKind];

export type ClientStats = { activeSeconds: number; blurCount: number; awaySeconds: number };

export type ReplaySegment = {
  id: string;
  startedAt: string;
  base: CodeFiles;
  events: ReplayEvent[];
  stats: ClientStats;
  truncated: boolean;
};

export const MAX_SEGMENT_EVENTS = 20_000;
const MAX_REPLAY_CHARS = 1_000_000;
const MAX_FILE = 100_000;

/** A typed insertion this long can't come from the keyboard (autocomplete inserts a few characters). */
export const LONG_INSERT = 30;
/** No Emmet abbreviation expands to more than this (the `!` page skeleton is ~300 characters). */
const MAX_SNIPPET = 2000;

export function normalizeNewlines(files: CodeFiles): CodeFiles {
  const fix = (s: string) => s.replace(/\r\n?/g, "\n");
  return { html: fix(files.html), css: fix(files.css), js: fix(files.js) };
}

function sameFiles(a: CodeFiles, b: CodeFiles) {
  return a.html === b.html && a.css === b.css && a.js === b.js;
}

export function applyEvent(files: CodeFiles, [, file, from, to, text]: ReplayEvent): CodeFiles {
  const key = FILE_KEYS[file];
  const doc = files[key];
  if (from > to || to > doc.length) throw new Error("event out of range");
  return { ...files, [key]: doc.slice(0, from) + text + doc.slice(to) };
}

/** Kind used for statistics: long "typed" insertions and unknown insertions count as pastes. */
export function effectiveKind([, , , , text, kind]: ReplayEvent, starterTexts: Set<string>): EventKind {
  // Formatting (Shift+Alt+F) only moves whitespace around — that's not pasted code
  if (kind === "t" && text.trim().length > LONG_INSERT) return "p";
  if (kind === "s" && text.length > MAX_SNIPPET) return "p";
  if (kind === "x" && text.trim().length > LONG_INSERT && !starterTexts.has(text)) return "p";
  return kind;
}

// ───────────── Validation (data comes from the student's browser) ─────────────

const count = z.number().int().min(0).max(10_000_000);
const filesSchema = z.object({ html: z.string().max(MAX_FILE), css: z.string().max(MAX_FILE), js: z.string().max(MAX_FILE) });
const eventSchema = z.tuple([
  count,
  z.union([z.literal(0), z.literal(1), z.literal(2)]),
  count,
  count,
  z.string().max(MAX_FILE),
  z.enum(["t", "p", "s", "d", "u", "x"]),
]);
const segmentSchema = z.object({
  id: z.string().min(1).max(64),
  startedAt: z.string().max(40),
  base: filesSchema,
  events: z.array(eventSchema).max(MAX_SEGMENT_EVENTS),
  stats: z.object({ activeSeconds: count, blurCount: count, awaySeconds: count }),
  truncated: z.boolean(),
});

export function parseSegments(value: unknown): ReplaySegment[] {
  const result = z.array(segmentSchema).safeParse(value);
  return result.success ? result.data : [];
}

export function parseSegment(value: unknown): ReplaySegment | null {
  const result = segmentSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Adds the current session (or replaces it when saved again) and keeps the total size bounded. */
export function mergeSegment(segments: ReplaySegment[], segment: ReplaySegment | null) {
  if (!segment) return segments;
  const merged = [...segments.filter((s) => s.id !== segment.id), segment];

  let size = JSON.stringify(merged).length;
  for (const s of merged) {
    if (size <= MAX_REPLAY_CHARS) break;
    // Oldest sessions lose their events first; statistics stay
    size -= JSON.stringify(s.events).length - 2;
    s.events = [];
    s.truncated = true;
  }
  return merged;
}

// ───────────── Summary shown to the teacher ─────────────

export type IntegrityFlag =
  | "mostlyPasted"
  | "largePaste"
  | "mostlySnippets"
  | "manyTabSwitches"
  | "tooFast"
  | "replayMismatch"
  | "noActivity";

export type IntegritySummary = {
  typed: number;
  pasted: number;
  /** Characters inserted by Emmet abbreviations (missing in summaries saved before Emmet existed) */
  snippets?: number;
  pasteCount: number;
  largestPaste: number;
  deleted: number;
  events: number;
  activeSeconds: number;
  blurCount: number;
  awaySeconds: number;
  sessions: number;
  pasteShare: number;
  firstActivityAt: string | null;
  replayMatches: boolean;
  truncated: boolean;
  flags: IntegrityFlag[];
};

export function summarize(segments: ReplaySegment[], submitted: CodeFiles, starter: CodeFiles): IntegritySummary {
  const starterNormalized = normalizeNewlines(starter);
  const starterTexts = new Set(FILE_KEYS.map((k) => starterNormalized[k]));
  const s: IntegritySummary = {
    typed: 0,
    pasted: 0,
    snippets: 0,
    pasteCount: 0,
    largestPaste: 0,
    deleted: 0,
    events: 0,
    activeSeconds: 0,
    blurCount: 0,
    awaySeconds: 0,
    sessions: segments.length,
    pasteShare: 0,
    firstActivityAt: segments[0]?.startedAt ?? null,
    replayMatches: false,
    truncated: false,
    flags: [],
  };

  let files: CodeFiles | null = null;
  let consistent = true;

  for (const segment of segments) {
    s.activeSeconds += segment.stats.activeSeconds;
    s.blurCount += segment.stats.blurCount;
    s.awaySeconds += segment.stats.awaySeconds;
    if (segment.truncated) s.truncated = true;

    // Each session must start where the previous one ended
    const base = normalizeNewlines(segment.base);
    if (files && !sameFiles(files, base)) consistent = false;
    files = base;

    for (const event of segment.events) {
      s.events++;
      const length = event[4].length;
      const kind = effectiveKind(event, starterTexts);
      if (kind === "p") {
        s.pasted += length;
        s.pasteCount++;
        s.largestPaste = Math.max(s.largestPaste, length);
      } else if (kind === "t") {
        s.typed += length;
      } else if (kind === "s") {
        s.snippets = (s.snippets ?? 0) + length;
      }
      s.deleted += event[3] - event[2];

      try {
        files = applyEvent(files, event);
      } catch {
        consistent = false;
      }
    }
  }

  const inserted = s.typed + s.pasted;
  s.pasteShare = inserted ? Math.round((s.pasted / inserted) * 100) / 100 : 0;
  s.replayMatches = consistent && !s.truncated && files !== null && sameFiles(files, normalizeNewlines(submitted));

  if (s.events === 0) s.flags.push("noActivity");
  if (s.pasted >= 200 && s.pasteShare >= 0.5) s.flags.push("mostlyPasted");
  if (s.largestPaste >= 300) s.flags.push("largePaste");
  if ((s.snippets ?? 0) >= 1500 && (s.snippets ?? 0) > s.typed * 3) s.flags.push("mostlySnippets");
  if (s.blurCount >= 10) s.flags.push("manyTabSwitches");
  if (inserted >= 800 && s.activeSeconds < 120) s.flags.push("tooFast");
  if (s.events > 0 && !s.truncated && !s.replayMatches) s.flags.push("replayMismatch");

  return s;
}

export function readSummary(value: unknown): IntegritySummary | null {
  return typeof value === "object" && value !== null && Array.isArray((value as IntegritySummary).flags)
    ? (value as IntegritySummary)
    : null;
}
