import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
};

export function Field({ label, hint, className = "", required, ...props }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input className="input" required={required} {...props} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <textarea className="input min-h-24 resize-y" {...props} />
    </label>
  );
}

export function FormAlert({ ok, message }: { ok: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
        ok ? "bg-success/10 text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {message}
    </p>
  );
}
