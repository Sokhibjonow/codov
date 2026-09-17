"use client";

import { Check, Copy, Download, Printer, TriangleAlert } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Credential } from "@/lib/action-state";

const noopSubscribe = () => () => {};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

export function CredentialsView({ credentials, t }: { credentials: Credential[]; t: Dictionary }) {
  const site = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);

  const asText = () =>
    [
      `${t.credentials.site}: ${site}`,
      "",
      ...credentials.map(
        (c) => `${c.name} (${t.roles[c.role]})\n${t.auth.login}: ${c.login}\n${t.auth.password}: ${c.password}`,
      ),
    ].join("\n\n");

  const copyAll = async () => {
    await navigator.clipboard.writeText(asText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCsv = () => {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      [t.credentials.name, t.fields.status, t.auth.login, t.auth.password, t.credentials.site],
      ...credentials.map((c) => [c.name, t.roles[c.role], c.login, c.password, site]),
    ];
    // BOM + semicolons so Excel opens Cyrillic text and columns correctly
    const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `codov-logins-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printCards = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    const cards = credentials
      .map(
        (c) => `<div class="card">
          <div class="brand">c<b>o</b>d<b>o</b>v</div>
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="role">${escapeHtml(t.roles[c.role])}</div>
          <table>
            <tr><td>${escapeHtml(t.credentials.site)}</td><td>${escapeHtml(site)}</td></tr>
            <tr><td>${escapeHtml(t.auth.login)}</td><td class="mono">${escapeHtml(c.login)}</td></tr>
            <tr><td>${escapeHtml(t.auth.password)}</td><td class="mono">${escapeHtml(c.password)}</td></tr>
          </table>
        </div>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>codov</title><style>
      body{font-family:Arial,sans-serif;margin:16px;color:#1b1c2e}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .card{border:1.5px dashed #9a9cb0;border-radius:12px;padding:14px;break-inside:avoid}
      .brand{font-weight:800;font-size:14px}.brand b{color:#D9502A}
      .name{font-size:18px;font-weight:700;margin-top:8px}.role{color:#6a6e86;font-size:12px;margin-bottom:8px}
      td{padding:3px 10px 3px 0;font-size:14px}td:first-child{color:#6a6e86}
      .mono{font-family:Consolas,monospace;font-size:16px;font-weight:700;letter-spacing:.5px}
    </style></head><body><div class="grid">${cards}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-accent/15 px-3.5 py-2.5 text-sm font-semibold text-[#92400e]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        {t.credentials.warning}
      </p>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {credentials.map((c) => (
          <li key={c.login} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{c.name}</p>
              <p className="text-xs text-muted">{t.roles[c.role]}</p>
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-3 font-mono text-sm">
              <dt className="text-muted">{t.auth.login}</dt>
              <dd className="font-bold select-all">{c.login}</dd>
              <dt className="text-muted">{t.auth.password}</dt>
              <dd className="font-bold select-all">{c.password}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyAll} className="btn border border-border bg-surface text-sm">
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          {copied ? t.common.copied : t.credentials.copyAll}
        </button>
        <button type="button" onClick={printCards} className="btn border border-border bg-surface text-sm">
          <Printer size={16} />
          {t.credentials.printCards}
        </button>
        <button type="button" onClick={downloadCsv} className="btn border border-border bg-surface text-sm">
          <Download size={16} />
          {t.credentials.downloadCsv}
        </button>
      </div>
    </div>
  );
}
