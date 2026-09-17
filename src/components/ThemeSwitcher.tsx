"use client";

import { Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_COOKIE, themeModes, type ThemeMode } from "@/lib/theme";

type Labels = { label: string; light: string; dark: string };

const ICONS: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon };

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

/** Remembers the choice for a year and applies it right away. */
function saveTheme(mode: ThemeMode) {
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.__applyTheme?.();
}

// The theme actually shown, read from <html data-theme> (set by the inline theme script)
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const currentTheme = () => (document.documentElement.dataset.theme as ThemeMode | undefined) ?? null;

/** Sun / moon switch. Until the user picks one, the site follows the device setting. */
export function ThemeSwitcher({ initial, labels }: { initial: ThemeMode | null; labels: Labels }) {
  const mode = useSyncExternalStore(subscribe, currentTheme, () => initial);

  return (
    <div role="group" aria-label={labels.label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {themeModes.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            onClick={() => saveTheme(option)}
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
