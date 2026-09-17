import type { Metadata } from "next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getThemeMode } from "@/lib/theme-server";
import { Logo } from "@/components/Logo";
import { getDictionary } from "@/i18n/server";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: { absolute: t.auth.title } };
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

        <Logo tone="light" size={36} className="relative" />

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
          <Logo className="lg:invisible" />
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
