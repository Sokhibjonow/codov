"use client";

import { CheckCircle2, Eye, EyeOff, Rocket } from "lucide-react";
import { useActionState, useState } from "react";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { register } from "./actions";

export type RegisterCourse = { id: string; title: string; description: string; freeLessons: number };

export function RegisterForm({ t, courses, preselected }: { t: Dictionary["register"]; courses: RegisterCourse[]; preselected?: string }) {
  const [state, formAction, pending] = useActionState(register, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-semibold text-danger">
          {t.errors[state.error]}
        </p>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">{t.course}</legend>
        <div className="grid gap-2">
          {courses.map((course) => (
            <label
              key={course.id}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border bg-surface p-3.5 transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50"
            >
              <input
                type="radio"
                name="courseId"
                value={course.id}
                defaultChecked={state?.courseId ? state.courseId === course.id : course.id === preselected || courses.length === 1}
                required
                className="peer sr-only"
              />
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                <CheckCircle2 size={14} strokeWidth={3} className="hidden group-has-[:checked]:block" />
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold">{course.title}</span>
                {course.description && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{course.description}</span>}
                <span className="mt-1 block text-xs font-bold text-primary">{format(t.freeLessons, { count: course.freeLessons })}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">{t.firstName}</span>
          <input name="firstName" className="input" autoComplete="given-name" maxLength={60} defaultValue={state?.firstName} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">
            {t.lastName} <span className="font-normal text-muted">{t.optional}</span>
          </span>
          <input name="lastName" className="input" autoComplete="family-name" maxLength={60} defaultValue={state?.lastName} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">{t.phone}</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          className="input"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          maxLength={30}
          defaultValue={state?.phone}
          required
        />
        <span className="mt-1 block text-xs text-muted">{t.phoneHint}</span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">{t.password}</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            className="input pr-12"
            autoComplete="new-password"
            minLength={6}
            maxLength={200}
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
        <span className="mt-1 block text-xs text-muted">{t.passwordHint}</span>
      </label>

      {/* Bots fill every field; people never see this one */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-3">
        <Rocket size={20} />
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
