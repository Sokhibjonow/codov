"use client";

import { CheckCheck } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type Entry = { status: Status | ""; note: string };

const STATUSES: Status[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

const activeClass: Record<Status, string> = {
  PRESENT: "border-success bg-success text-on-color",
  LATE: "border-accent bg-accent text-on-color",
  ABSENT: "border-danger bg-danger text-on-color",
  EXCUSED: "border-primary bg-primary text-on-color",
};

type AttendanceRowsProps = {
  t: Dictionary;
  students: { id: string; name: string }[];
  initial: Record<string, { status: Status; note: string | null }>;
};

export function AttendanceRows({ t, students, initial }: AttendanceRowsProps) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.map((s) => [s.id, { status: initial[s.id]?.status ?? "", note: initial[s.id]?.note ?? "" }])),
  );

  const update = (id: string, patch: Partial<Entry>) => setEntries((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, e]) => [id, { ...e, status: "PRESENT" }])))}
        className="btn border border-border bg-surface text-sm"
      >
        <CheckCheck size={16} />
        {t.attendance.markAll}
      </button>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {students.map((student, index) => {
          const entry = entries[student.id];
          return (
            <li key={student.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <span className="w-6 text-right text-xs font-bold text-muted">{index + 1}</span>
              <span className="min-w-40 flex-1 font-bold">{student.name}</span>
              <input type="hidden" name={`status_${student.id}`} value={entry.status} />
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={student.name}>
                {STATUSES.map((status) => {
                  const active = entry.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      // Clicking the selected status again clears the mark
                      onClick={() => update(student.id, { status: active ? "" : status })}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                        active ? activeClass[status] : "border-border bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {t.attendance.statuses[status]}
                    </button>
                  );
                })}
              </div>
              <input
                name={`note_${student.id}`}
                value={entry.note}
                onChange={(e) => update(student.id, { note: e.target.value })}
                placeholder={t.attendance.note}
                maxLength={300}
                className="input w-full py-1.5 text-sm sm:w-48"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
