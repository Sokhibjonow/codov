import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getDictionary } from "@/i18n/server";
import { getPolicy } from "@/lib/privacy";
import { PRIVACY_PATH, SITE_TITLE } from "@/lib/site";
import { getThemeMode } from "@/lib/theme-server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getDictionary();
  const policy = getPolicy(locale);
  return {
    title: { absolute: `${policy.title} · ${SITE_TITLE}` },
    description: policy.intro,
    alternates: { canonical: PRIVACY_PATH },
  };
}

/** Privacy policy and cookie list: public, in the language of the visitor. */
export default async function PrivacyPage() {
  const [{ locale, t }, theme] = await Promise.all([getDictionary(), getThemeMode()]);
  const policy = getPolicy(locale);

  return (
    <div className="min-h-screen px-5 py-5 sm:px-10">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <Link href={locale === "ru" ? "/ru" : "/"} aria-label={t.legal.home}>
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher initial={theme} labels={t.common.theme} />
          <LanguageSwitcher current={locale} label={t.common.language} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl py-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{policy.title}</h1>
        <p className="mt-2 text-sm font-semibold text-muted">{policy.updated}</p>
        <p className="mt-6 text-lg">{policy.intro}</p>

        {policy.blocks.map((block) => (
          <section key={block.title} className="mt-10">
            <h2 className="text-xl font-extrabold">{block.title}</h2>
            {block.text?.map((p) => (
              <p key={p} className="mt-3 leading-relaxed">
                {p}
              </p>
            ))}
            {block.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed marker:text-primary">
                {block.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {block.table && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-surface">
                    <tr>
                      {block.table.head.map((h) => (
                        <th key={h} className="px-3 py-2 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.table.rows.map((row) => (
                      <tr key={row[0]} className="border-t border-border">
                        {row.map((cell, i) => (
                          <td key={i} className={`px-3 py-2 align-top ${i === 0 ? "font-mono text-xs font-bold" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <p className="mt-12">
          <Link href={locale === "ru" ? "/ru" : "/"} className="font-bold text-primary hover:underline">
            ← {t.legal.home}
          </Link>
        </p>
      </main>
    </div>
  );
}
