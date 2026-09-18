import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "./config";
import { ru, type Dictionary } from "./dictionaries/ru";
import { uz } from "./dictionaries/uz";

const dictionaries: Record<Locale, Dictionary> = { uz, ru };

/** The language picked by the visitor (cookie), unless the page address fixes it (/ and /ru). */
export async function getLocale(): Promise<Locale> {
  const fixed = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fixed)) return fixed;
  return getPreferredLocale();
}

export async function getPreferredLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
