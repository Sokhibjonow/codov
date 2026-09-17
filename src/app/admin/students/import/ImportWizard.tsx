"use client";

import { CheckCircle2, Download, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CredentialsView } from "@/components/admin/CredentialsView";
import { Badge } from "@/components/ui/Badge";
import { FormAlert } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ImportState } from "@/lib/import";
import { commitImport, previewImport } from "./actions";

export function ImportWizard({ t }: { t: Dictionary }) {
  const [preview, setPreview] = useState<ImportState>();
  const [result, setResult] = useState<ImportState>();
  // Remounts the file input when starting over
  const [attempt, setAttempt] = useState(0);

  const restart = () => {
    setPreview(undefined);
    setResult(undefined);
    setAttempt((n) => n + 1);
  };

  if (result?.ok && result.credentials) {
    return (
      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-success">
          <CheckCircle2 size={22} />
          {result.message}
        </h2>
        <CredentialsView credentials={result.credentials} t={t} />
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link href="/admin/students" className="btn btn-primary">
            {t.students.title}
          </Link>
          <button type="button" onClick={restart} className="btn btn-ghost">
            <RotateCcw size={18} />
            {t.import.again}
          </button>
        </div>
      </section>
    );
  }

  const rows = preview?.ok ? (preview.rows ?? []) : [];
  const validRows = rows.filter((r) => !r.error);
  const errorCount = rows.length - validRows.length;

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="text-lg font-extrabold">{t.import.step1}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t.import.step1Hint}</p>
        <a href="/admin/students/import/template" download className="btn border border-border bg-surface">
          <Download size={18} />
          {t.import.template}
        </a>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-extrabold">{t.import.step2}</h2>
        <form
          key={attempt}
          className="flex flex-wrap items-center gap-3"
          action={async (formData) => {
            setResult(undefined);
            setPreview(await previewImport(undefined, formData));
          }}
        >
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv"
            required
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-bold file:text-primary"
          />
          <SubmitButton>
            <Upload size={18} />
            {t.import.upload}
          </SubmitButton>
        </form>
        {preview && !preview.ok && (
          <div className="mt-4">
            <FormAlert ok={false} message={preview.message} />
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <section className="card space-y-4">
          <h2 className="text-lg font-extrabold">{t.import.step3}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{format(t.import.rowsOk, { count: validRows.length })}</Badge>
            {errorCount > 0 && <Badge tone="danger">{format(t.import.rowsError, { count: errorCount })}</Badge>}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-background text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{t.import.row}</th>
                  <th className="px-3 py-2">{t.credentials.name}</th>
                  <th className="px-3 py-2">{t.fields.phone}</th>
                  <th className="px-3 py-2">{t.import.columns.group}</th>
                  <th className="px-3 py-2">{t.roles.PARENT}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.line} className={row.error ? "bg-danger-soft/60" : undefined}>
                    <td className="px-3 py-2 text-muted">{row.line}</td>
                    <td className="px-3 py-2 font-semibold">
                      {`${row.lastName} ${row.firstName}`.trim() || "—"}
                      {row.error && <span className="block text-xs font-bold text-danger">{row.error}</span>}
                    </td>
                    <td className="px-3 py-2">{row.phone}</td>
                    <td className="px-3 py-2">
                      {row.group}
                      {row.groupIsNew && (
                        <span className="ml-1.5">
                          <Badge tone="accent">{t.import.newGroup}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {`${row.parentLastName} ${row.parentFirstName}`.trim()}
                      {row.parentPhone && <span className="block text-xs text-muted">{row.parentPhone}</span>}
                      {row.parentExists && <Badge tone="primary">{t.import.existingParent}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            className="flex flex-wrap gap-2"
            action={async (formData) => {
              setResult(await commitImport(undefined, formData));
            }}
          >
            <input type="hidden" name="rows" value={JSON.stringify(validRows)} />
            <SubmitButton disabled={validRows.length === 0}>{format(t.import.confirm, { count: validRows.length })}</SubmitButton>
            <button type="button" onClick={restart} className="btn btn-ghost">
              <RotateCcw size={18} />
              {t.import.again}
            </button>
          </form>
          {result && !result.ok && <FormAlert ok={false} message={result.message} />}
        </section>
      )}
    </div>
  );
}
