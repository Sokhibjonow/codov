"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { login } from "./actions";

export function LoginForm({ t }: { t: Dictionary["auth"] }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-semibold text-danger">
          {t.errors[state.error]}
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">{t.login}</span>
        <input
          name="login"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state?.login}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">{t.password}</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            className="input pr-12"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t.hidePassword : t.showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-primary"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1">
        <input type="checkbox" name="remember" defaultChecked className="mt-1 size-4 shrink-0 accent-primary" />
        <span>
          <span className="block text-sm font-bold">{t.remember}</span>
          <span className="block text-xs text-muted">{t.rememberHint}</span>
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-3">
        <LogIn size={20} />
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
