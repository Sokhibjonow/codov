import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

/** `publicPage`: on the public page switching also moves to that language's address (/ or /ru) */
export function LanguageSwitcher({ current, label, publicPage = false }: { current: Locale; label: string; publicPage?: boolean }) {
  return (
    <form action={setLocale} className="inline-flex rounded-lg border border-border bg-surface p-0.5" aria-label={label}>
      {publicPage && <input type="hidden" name="public" value="1" />}
      {locales.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          aria-pressed={locale === current}
          className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
            locale === current
              ? "bg-primary text-on-color"
              : "text-muted hover:bg-primary-soft hover:text-primary"
          }`}
        >
          {locale}
        </button>
      ))}
    </form>
  );
}
