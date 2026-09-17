"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type ParentOption = { id: string; name: string; phone: string };

export function LinkParentFields({ t, parents }: { t: Dictionary; parents: ParentOption[] }) {
  const [mode, setMode] = useState<"existing" | "new">(parents.length > 0 ? "existing" : "new");

  return (
    <div className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1" role="tablist">
        {(["existing", "new"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              mode === value ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {value === "existing" ? t.students.existingParent : t.students.newParent}
          </button>
        ))}
      </div>

      {mode === "existing" ? (
        parents.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">{t.students.chooseParent}</span>
            <select name="parentId" required className="input">
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.phone && ` · ${p.phone}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted">{t.parents.empty}</p>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="parentLastName" label={t.fields.lastName} maxLength={60} />
          <Field name="parentFirstName" label={t.fields.firstName} maxLength={60} required />
          <Field
            name="parentPhone"
            type="tel"
            inputMode="tel"
            label={t.fields.phone}
            placeholder="+998 90 123 45 67"
            maxLength={30}
            className="sm:col-span-2"
          />
        </div>
      )}
    </div>
  );
}
