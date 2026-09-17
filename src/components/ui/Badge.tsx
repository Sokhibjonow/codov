import type { ReactNode } from "react";

const tones = {
  neutral: "bg-background text-muted border border-border",
  primary: "bg-primary-soft text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent/15 text-[#b45309]",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
