"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { AUTOTEST_TYPES, MAX_RULES, newRule, type AutotestRule, type AutotestType } from "@/lib/autotests";

type AutotestsEditorProps = {
  t: Dictionary;
  rules: AutotestRule[];
  onChange: (rules: AutotestRule[]) => void;
};

function Input({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`input py-2 ${type === "text" ? "font-mono text-sm" : ""}`}
      />
    </label>
  );
}

/** Teacher builds autotests from ready-made blocks — no code needed. */
export function AutotestsEditor({ t, rules, onChange }: AutotestsEditorProps) {
  const [newType, setNewType] = useState<AutotestType>("exists");
  const ta = t.autotests;

  const update = (index: number, patch: Partial<AutotestRule>) =>
    onChange(rules.map((rule, i) => (i === index ? ({ ...rule, ...patch } as AutotestRule) : rule)));
  const number = (value: string) => Math.max(0, Number.parseInt(value, 10) || 0);

  const fields = (rule: AutotestRule, index: number) => {
    const set = (patch: Partial<AutotestRule>) => update(index, patch);
    const selector = <Input label={ta.selector} value={"selector" in rule ? rule.selector : ""} placeholder=".card" onChange={(v) => set({ selector: v })} />;
    switch (rule.type) {
      case "exists":
        return (
          <>
            {selector}
            <Input label={ta.min} type="number" value={rule.min} onChange={(v) => set({ min: Math.max(1, number(v)) })} />
          </>
        );
      case "count":
        return (
          <>
            {selector}
            <Input label={ta.count} type="number" value={rule.count} onChange={(v) => set({ count: number(v) })} />
          </>
        );
      case "text":
        return (
          <>
            {selector}
            <Input label={ta.text} value={rule.text} placeholder="Salom" onChange={(v) => set({ text: v })} />
          </>
        );
      case "attribute":
        return (
          <>
            {selector}
            <Input label={ta.attribute} value={rule.attribute} placeholder="href" onChange={(v) => set({ attribute: v })} />
            <Input label={`${ta.value} (${t.common.optional})`} value={rule.value} onChange={(v) => set({ value: v })} />
          </>
        );
      case "style":
        return (
          <>
            {selector}
            <Input label={ta.property} value={rule.property} placeholder="display" onChange={(v) => set({ property: v })} />
            <Input label={ta.value} value={rule.value} placeholder="flex" onChange={(v) => set({ value: v })} />
          </>
        );
      case "click":
        return (
          <>
            {selector}
            <Input label={ta.target} value={rule.target} placeholder="#out" onChange={(v) => set({ target: v })} />
            <Input label={ta.text} value={rule.text} onChange={(v) => set({ text: v })} />
          </>
        );
      case "input":
        return (
          <>
            <Input label={ta.field} value={rule.selector} placeholder="#myInput" onChange={(v) => set({ selector: v })} />
            <Input label={ta.value} value={rule.value} placeholder="Ali" onChange={(v) => set({ value: v })} />
            <Input label={ta.button} value={rule.button} placeholder="button" onChange={(v) => set({ button: v })} />
            <Input label={ta.target} value={rule.target} placeholder="#out" onChange={(v) => set({ target: v })} />
            <Input label={ta.text} value={rule.text} placeholder="Salom, Ali" onChange={(v) => set({ text: v })} />
          </>
        );
      case "console":
        return <Input label={ta.text} value={rule.text} onChange={(v) => set({ text: v })} />;
      case "noErrors":
        return null;
      case "code":
        return (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">{ta.file}</span>
              <select value={rule.file} onChange={(e) => set({ file: e.target.value as "html" | "css" | "js" })} className="input py-2 font-mono text-sm">
                <option value="html">index.html</option>
                <option value="css">style.css</option>
                <option value="js">script.js</option>
              </select>
            </label>
            <Input label={ta.pattern} value={rule.pattern} placeholder="addEventListener" onChange={(v) => set({ pattern: v })} />
          </>
        );
    }
  };

  return (
    <div className="space-y-3">
      {rules.length === 0 && <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted">{ta.empty}</p>}

      {rules.map((rule, index) => (
        <div key={rule.id} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-xs font-bold text-primary">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{ta.types[rule.type]}</span>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              {ta.points}
              <input
                type="number"
                min={1}
                max={100}
                value={rule.points}
                onChange={(e) => update(index, { points: Math.min(100, Math.max(1, number(e.target.value))) })}
                className="input w-16 px-2 py-1 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => onChange(rules.filter((_, i) => i !== index))}
              className="btn btn-ghost p-1.5 hover:text-danger"
              title={ta.remove}
              aria-label={ta.remove}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {rule.type !== "noErrors" && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{fields(rule, index)}</div>}
        </div>
      ))}

      {rules.length < MAX_RULES && (
        <div className="flex flex-wrap gap-2">
          <select value={newType} onChange={(e) => setNewType(e.target.value as AutotestType)} className="input w-auto min-w-0 flex-1 py-2 sm:flex-none">
            {AUTOTEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {ta.types[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange([...rules, newRule(newType, crypto.randomUUID())])}
            className="btn border border-border bg-surface text-sm"
          >
            <Plus size={16} />
            {ta.add}
          </button>
        </div>
      )}
    </div>
  );
}
