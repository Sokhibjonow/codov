"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { THEME_COOKIE, themeModes, type ThemeMode } from "@/lib/theme";

type Labels = { label: string; light: string; dark: string; system: string };

const ICONS: Record<ThemeMode, LucideIcon> = { light: Sun, system: Monitor, dark: Moon };

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

/** Remembers the choice for a year ("system" forgets it) and applies it right away. */
function saveTheme(mode: ThemeMode) {
  document.cookie =
    mode === "system"
      ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${THEME_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.__applyTheme?.();
}

/** Sun / device / moon switch. */
export function ThemeSwitcher({ initial, labels }: { initial: ThemeMode; labels: Labels }) {
  const [mode, setMode] = useState(initial);

  const choose = (next: ThemeMode) => {
    setMode(next);
    saveTheme(next);
  };

  return (
    <div role="group" aria-label={labels.label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {themeModes.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            aria-pressed={option === mode}
            aria-label={labels[option]}
            title={labels[option]}
            className={`rounded-md px-2 py-1 transition-colors ${
              option === mode ? "bg-primary text-on-color" : "text-muted hover:bg-primary-soft hover:text-primary"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
