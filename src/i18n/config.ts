export const locales = ["uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uz";
export const LOCALE_COOKIE = "cubick_locale";
/** Set by the proxy on pages whose address fixes the language (/ and /ru) */
export const LOCALE_HEADER = "x-codov-locale";

export const localeNames: Record<Locale, string> = {
  uz: "O‘zbekcha",
  ru: "Русский",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Replaces {name} placeholders: format("Hi, {name}", { name: "Ali" }) */
export function format(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
