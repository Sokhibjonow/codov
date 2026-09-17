import type { Locale } from "@/i18n/config";

/** Picks the text in the current language, falling back to the other one when it's empty. Safe for client components. */
export function pick(locale: Locale, uz: string, ru: string) {
  return locale === "uz" ? uz || ru : ru || uz;
}
