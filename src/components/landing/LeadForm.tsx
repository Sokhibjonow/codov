"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { submitLead, type LeadState } from "@/app/lead-actions";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { maskUzPhone } from "@/lib/phone";

type Labels = Dictionary["landing"]["lead"];

/** "Questions left? Contact us": name + phone, saved as a lead for the teacher. */
export function LeadForm({ t }: { t: Labels }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, { status: "idle" });
  const [phone, setPhone] = useState("");

  if (state.status === "ok") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-success/10 p-5 text-left" role="status">
        <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-success" />
        <div>
          <p className="font-extrabold">{t.success}</p>
          <p className="text-muted">{t.successText}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      {/* Hidden from people, filled by spam bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="flex-1">
          <span className="sr-only">{t.name}</span>
          <input
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder={t.name}
            aria-invalid={state.error === "name"}
            className="input rounded-full px-5 py-3 aria-[invalid=true]:border-danger"
          />
        </label>
        <label className="flex-1">
          <span className="sr-only">{t.phone}</span>
          <input
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 (__) ___-__-__"
            value={phone}
            onChange={(event) => setPhone(maskUzPhone(event.target.value))}
            aria-invalid={state.error === "phone"}
            className="input rounded-full px-5 py-3 font-mono aria-[invalid=true]:border-danger"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn rounded-full bg-gradient-to-r from-brand to-primary px-6 py-3 text-on-color shadow-lg shadow-brand/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {pending ? t.sending : t.submit}
        </button>
      </div>
      {state.status === "error" && state.error && (
        <p className="text-sm font-semibold text-danger" role="alert">
          {t.errors[state.error]}
        </p>
      )}
    </form>
  );
}
