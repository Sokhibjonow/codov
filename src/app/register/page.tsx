import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { CookieNotice } from "@/components/CookieNotice";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getThemeMode } from "@/lib/theme-server";
import { Logo } from "@/components/Logo";
import { getDictionary } from "@/i18n/server";
import { pick } from "@/lib/learning";
import { SITE_TITLE } from "@/lib/site";
import { getTrialCourses } from "@/lib/trial";
import { RegisterForm } from "./RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: { absolute: `${t.register.title} · ${SITE_TITLE}` },
    description: t.register.subtitle,
    alternates: { canonical: "/register" },
  };
}

/** Links from videos and posts pick the course: /register?kurs=js or ?kurs=start (a word of the course title). */
function courseFromLink(kurs: string | string[] | undefined, courses: { id: string; titleUz: string; titleRu: string }[]) {
  const word = (Array.isArray(kurs) ? kurs[0] : kurs)?.trim().toLowerCase();
  if (!word) return undefined;
  const wanted = word === "js" ? "javascript" : word;
  return courses.find((c) => `${c.titleUz} ${c.titleRu}`.toLowerCase().includes(wanted))?.id;
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ kurs?: string | string[] }> }) {
  const [{ locale, t }, theme, trialCourses] = await Promise.all([getDictionary(), getThemeMode(), getTrialCourses()]);
  const preselected = courseFromLink((await searchParams).kurs, trialCourses);
  const courses = trialCourses.map((c) => ({
    id: c.id,
    title: pick(locale, c.titleUz, c.titleRu),
    description: pick(locale, c.descriptionUz, c.descriptionRu),
    freeLessons: c.freeLessons,
  }));

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
          <h2 className="text-4xl font-extrabold leading-tight">{t.register.brandTitle}</h2>
          <p className="mt-4 text-lg text-white/80">{t.register.brandText}</p>
          <ul className="mt-8 space-y-3">
            {t.register.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand">
                  <Check size={15} strokeWidth={3} />
                </span>
                <span className="font-semibold">{perk}</span>
              </li>
            ))}
          </ul>
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

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{t.register.title}</h1>
          <p className="mb-8 mt-2 text-muted">{t.register.subtitle}</p>
          {courses.length > 0 ? (
            <RegisterForm t={t.register} legal={t.legal} courses={courses} preselected={preselected} />
          ) : (
            <p className="rounded-xl bg-primary-soft px-4 py-3 font-semibold text-primary">{t.register.errors.closed}</p>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            {t.register.haveAccount}{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              {t.register.login}
            </Link>
          </p>
        </div>
      </main>
      <CookieNotice t={t.legal} />
    </div>
  );
}
