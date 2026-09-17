"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CodeFileIndex } from "@/components/code/files";
import { MAX_SEGMENT_EVENTS, normalizeNewlines, type EditChange, type EventKind, type ReplaySegment } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";

const ACTIVE_TICK_MS = 5000;
const IDLE_AFTER_MS = 60_000;

/**
 * Records the current editing session: every change in the editor, active time and how often
 * the student left the page. The segment is sent with every autosave and with the submission.
 */
export function useIntegrityRecorder(initialCode: CodeFiles) {
  const segmentRef = useRef<ReplaySegment | null>(null);
  const startedRef = useRef(0);
  const lastInteractionRef = useRef(0);
  const awaySinceRef = useRef<number | null>(null);
  const initialCodeRef = useRef(initialCode);

  const restart = useCallback((base: CodeFiles) => {
    const now = Date.now();
    startedRef.current = now;
    lastInteractionRef.current = now;
    segmentRef.current = {
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      startedAt: new Date(now).toISOString(),
      base: normalizeNewlines(base),
      events: [],
      stats: { activeSeconds: 0, blurCount: 0, awaySeconds: 0 },
      truncated: false,
    };
  }, []);

  useEffect(() => {
    restart(initialCodeRef.current);
  }, [restart]);

  useEffect(() => {
    const touch = () => {
      lastInteractionRef.current = Date.now();
    };

    const tick = setInterval(() => {
      const segment = segmentRef.current;
      if (segment && document.visibilityState === "visible" && Date.now() - lastInteractionRef.current < IDLE_AFTER_MS) {
        segment.stats.activeSeconds += ACTIVE_TICK_MS / 1000;
      }
    }, ACTIVE_TICK_MS);

    const onBlur = () => {
      // Clicking into the preview frame also blurs the window — that's not leaving the page
      setTimeout(() => {
        const segment = segmentRef.current;
        if (!segment || awaySinceRef.current !== null || document.activeElement?.tagName === "IFRAME") return;
        segment.stats.blurCount++;
        awaySinceRef.current = Date.now();
      }, 0);
    };
    const onFocus = () => {
      const segment = segmentRef.current;
      if (segment && awaySinceRef.current !== null) {
        segment.stats.awaySeconds += Math.round((Date.now() - awaySinceRef.current) / 1000);
      }
      awaySinceRef.current = null;
      touch();
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    for (const type of ["keydown", "pointerdown", "wheel", "touchstart"]) {
      window.addEventListener(type, touch, { passive: true });
    }
    return () => {
      clearInterval(tick);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      for (const type of ["keydown", "pointerdown", "wheel", "touchstart"]) window.removeEventListener(type, touch);
    };
  }, []);

  /** Changes must be applicable one after another (both editors convert them that way). */
  const record = useCallback((file: CodeFileIndex, changes: EditChange[], kind: EventKind) => {
    const segment = segmentRef.current;
    if (!segment) return;
    lastInteractionRef.current = Date.now();

    const t = Date.now() - startedRef.current;
    for (const { from, to, text } of changes) {
      if (segment.events.length >= MAX_SEGMENT_EVENTS) {
        segment.truncated = true;
        return;
      }
      segment.events.push([t, file, from, to, text, kind]);
    }
  }, []);

  const snapshot = useCallback((): ReplaySegment | null => (segmentRef.current ? structuredClone(segmentRef.current) : null), []);

  return { record, snapshot, restart };
}
