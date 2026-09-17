"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeTabsEditor } from "@/components/code/CodeTabsEditor";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { applyEvent, FILE_KEYS, normalizeNewlines, type ReplaySegment } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";

type Frame = { position: number; files: CodeFiles; activeFile: 0 | 1 | 2 };

const SPEEDS = [1, 4, 16, 64];
const TICK_MS = 60;
const MAX_MARKERS = 150;

function safeApply(files: CodeFiles, event: ReplaySegment["events"][number]) {
  try {
    return applyEvent(files, event);
  } catch {
    return files;
  }
}

function frameAt(segment: ReplaySegment, position: number): Frame {
  let files = normalizeNewlines(segment.base);
  let activeFile: 0 | 1 | 2 = 0;
  for (const event of segment.events.slice(0, position)) {
    files = safeApply(files, event);
    activeFile = event[1];
  }
  return { position, files, activeFile };
}

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Plays back how the student typed the code, session by session. Pastes are marked on the timeline. */
export function ReplayPlayer({ segments, t }: { segments: ReplaySegment[]; t: Dictionary }) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [frame, setFrame] = useState<Frame | null>(() => (segments[0] ? frameAt(segments[0], 0) : null));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);

  const segment = segments[segmentIndex];
  const total = segment?.events.length ?? 0;
  const atEnd = frame !== null && frame.position >= total;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying || !segment) return;
    const timer = setInterval(() => {
      setFrame((prev) => {
        if (!prev) return prev;
        let { position, files, activeFile } = prev;
        for (let i = 0; i < speed && position < segment.events.length; i++) {
          const event = segment.events[position];
          files = safeApply(files, event);
          activeFile = event[1];
          position++;
        }
        return { position, files, activeFile };
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, speed, segment]);

  if (!segment || !frame) {
    return <p className="p-6 text-center text-muted">{t.integrity.noReplay}</p>;
  }

  const togglePlay = () => {
    if (atEnd) setFrame(frameAt(segment, 0));
    setPlaying(!isPlaying);
  };

  const current = segment.events[frame.position - 1];
  const pasteMarkers = segment.events
    .map((event, index) => ({ index, event }))
    .filter(({ event }) => event[5] === "p" || (event[5] === "t" && event[4].length > 30) || (event[5] === "x" && event[4].length > 30))
    .slice(0, MAX_MARKERS);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        {segments.length > 1 && (
          <select
            value={segmentIndex}
            onChange={(e) => {
              const index = Number(e.target.value);
              setSegmentIndex(index);
              setFrame(frameAt(segments[index], 0));
              setPlaying(false);
            }}
            className="input w-auto py-1.5 text-sm"
          >
            {segments.map((s, i) => (
              <option key={s.id} value={i}>
                {format(t.integrity.session, { n: i + 1 })} · {new Date(s.startedAt).toLocaleString()}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={togglePlay} className="btn btn-primary px-3 py-1.5 text-sm" disabled={total === 0}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? t.integrity.pause : t.integrity.play}
        </button>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          {t.integrity.speed}
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="input w-auto px-2 py-1 text-sm">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                ×{s}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-xs font-semibold tabular-nums text-muted">
          {format(t.integrity.step, { n: frame.position, total })} · {clock(current?.[0] ?? 0)}
        </span>
      </div>

      <div className="relative border-b border-border bg-surface px-3 py-2">
        <input
          type="range"
          min={0}
          max={total}
          value={frame.position}
          onChange={(e) => {
            setPlaying(false);
            setFrame(frameAt(segment, Number(e.target.value)));
          }}
          className="w-full accent-primary"
          aria-label={t.integrity.step}
        />
        <div className="pointer-events-none relative mx-2 h-2">
          {pasteMarkers.map(({ index }) => (
            <span key={index} className="absolute top-0 h-2 w-0.5 bg-danger" style={{ left: `${(index / Math.max(total, 1)) * 100}%` }} />
          ))}
        </div>
        {current && pasteMarkers.some((m) => m.index === frame.position - 1) && (
          <p className="mt-1 text-xs font-bold text-danger">{format(t.integrity.pasteEvent, { n: current[4].length })}</p>
        )}
      </div>

      <CodeTabsEditor code={frame.files} readOnly activeFile={FILE_KEYS[frame.activeFile]} className="min-h-0 flex-1" />
    </div>
  );
}
