"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { PRIVACY_PATH } from "@/lib/site";

const COOKIE = "codov_cookies";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const dismissed = () => document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));

/**
 * Tells first-time visitors of the public pages which cookies the site uses. Only necessary cookies exist,
 * so this is a notice, not a consent banner: closing it just remembers that it was read.
 */
export function CookieNotice({ t }: { t: Dictionary["legal"] }) {
  // On the server and before hydration the notice stays hidden, so it never flashes for those who closed it
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  if (hidden) return null;

  const close = () => {
    document.cookie = `${COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    listeners.forEach((l) => l());
  };

  return (
    <div role="region" aria-label="Cookie" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-lg sm:inset-x-6">
      <div className="flex items-start gap-3">
        <Cookie size={22} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-sm">
          {t.cookieText}{" "}
          <Link href={PRIVACY_PATH} className="font-bold text-primary hover:underline">
            {t.cookieMore}
          </Link>
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={close} className="btn btn-primary px-4 py-2 text-sm">
          {t.cookieOk}
        </button>
      </div>
    </div>
  );
}
