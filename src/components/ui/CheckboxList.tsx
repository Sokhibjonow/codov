"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export type CheckboxOption = {
  value: string;
  label: string;
  hint?: string;
};

type CheckboxListProps = {
  name: string;
  options: CheckboxOption[];
  defaultSelected?: string[];
  searchPlaceholder?: string;
  emptyText: string;
};

export function CheckboxList({ name, options, defaultSelected = [], searchPlaceholder, emptyText }: CheckboxListProps) {
  const [selected, setSelected] = useState(() => new Set(defaultSelected));
  const [query, setQuery] = useState("");

  if (options.length === 0) {
    return <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted">{emptyText}</p>;
  }

  const q = query.trim().toLowerCase();
  const toggle = (value: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  return (
    <div className="rounded-xl border border-border">
      {options.length > 6 && searchPlaceholder && (
        <div className="relative border-b border-border">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-t-xl bg-transparent py-2.5 pl-9 pr-3 text-base outline-none"
          />
        </div>
      )}
      <ul className="max-h-64 overflow-y-auto p-1.5">
        {options.map((option) => {
          // Filtered-out items stay mounted so their checked state is still submitted
          const visible = !q || `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(q);
          return (
            <li key={option.value} hidden={!visible}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-background">
                <input
                  type="checkbox"
                  name={name}
                  value={option.value}
                  checked={selected.has(option.value)}
                  onChange={() => toggle(option.value)}
                  className="size-4 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{option.label}</span>
                  {option.hint && <span className="block truncate text-xs text-muted">{option.hint}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
