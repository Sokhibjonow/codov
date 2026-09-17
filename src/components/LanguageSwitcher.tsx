import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  return (
    <form action={setLocale} className="inline-flex rounded-lg border border-border bg-surface p-0.5" aria-label={label}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          aria-pressed={locale === current}
          className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
            locale === current
              ? "bg-primary text-white"
              : "text-muted hover:bg-primary-soft hover:text-primary"
          }`}
        >
          {locale}
        </button>
      ))}
    </form>
  );
}
