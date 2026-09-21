import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getThemeMode } from "@/lib/theme-server";
import { Logo } from "@/components/Logo";
import { getDictionary } from "@/i18n/server";
import { SITE_TITLE } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    // Search results show the platform name and topic, the tab shows the sign-in title
    title: { absolute: `${t.auth.title} · ${SITE_TITLE}` },
    alternates: { canonical: "/login" },
    // The sign-in form is not what people search for: keep it out of results so they land on the public page
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage() {
  const [{ locale, t }, theme] = await Promise.all([getDictionary(), getThemeMode()]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-96 rotate-12 rounded-[4rem] bg-brand/25"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 size-80 -rotate-12 rounded-[3rem] bg-brand-light/10"
        />

        <Link href="/" className="relative w-fit" aria-label="codov">
          <Logo tone="light" size={36} />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">{t.auth.brandTitle}</h2>
          <p className="mt-4 text-lg text-white/80">{t.auth.brandText}</p>

          <pre className="mt-8 overflow-x-auto rounded-2xl bg-black/30 p-5 ring-1 ring-white/10 font-mono text-sm leading-relaxed shadow-2xl">
            <code>
              <span className="text-brand-light">&lt;div</span> <span className="text-accent">class</span>=
              <span className="text-[#7ee0a1]">&quot;card&quot;</span>
              <span className="text-brand-light">&gt;</span>
              {"\n  "}
              <span className="text-brand-light">&lt;h1&gt;</span>Salom, dunyo!
              <span className="text-brand-light">&lt;/h1&gt;</span>
              {"\n"}
              <span className="text-brand-light">&lt;/div&gt;</span>
            </code>
          </pre>
        </div>

        <p className="relative text-sm text-white/60">{t.common.tagline}</p>
      </section>

      <main className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible" aria-label="codov">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher initial={theme} labels={t.common.theme} />
            <LanguageSwitcher current={locale} label={t.common.language} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{t.auth.title}</h1>
          <p className="mb-8 mt-2 text-muted">{t.auth.subtitle}</p>
          <LoginForm t={t.auth} />
        </div>
      </main>
    </div>
  );
}
