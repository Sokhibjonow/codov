import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "./site";

// What search engines show for the public page, per language.
// Titles lead with what people actually search for ("dasturlash kurslari", "курсы программирования").

const SEO: Record<Locale, { title: string; description: string; keywords: string[]; ogLocale: string }> = {
  uz: {
    title: "Dasturlash kurslari: HTML, React, Node.js va AI | codov",
    description:
      "Veb-dasturlash kurslari oflayn, onlayn va mustaqil: HTML, CSS, JavaScript, React, TypeScript, Node.js, SQL, Git va sun’iy intellekt. Har bir ishni o‘qituvchi tekshiradi.",
    keywords: [
      "dasturlash kurslari",
      "dasturlash kursi",
      "IT kurslar",
      "IT kurs",
      "veb dasturlash kurslari",
      "web dasturlash",
      "frontend kurslari",
      "backend kurslari",
      "HTML CSS o‘rganish",
      "JavaScript kurslari",
      "React kurslari",
      "Node.js kurslari",
      "SQL kurslari",
      "onlayn dasturlash kurslari",
      "oflayn dasturlash kurslari",
      "dasturlashni noldan o‘rganish",
      "IT ta’lim",
      "codov",
    ],
    ogLocale: "uz_UZ",
  },
  ru: {
    title: "Курсы программирования: HTML, React, Node.js и ИИ | codov",
    description:
      "Курсы веб-разработки офлайн, онлайн и самостоятельно: HTML, CSS, JavaScript, React, TypeScript, Node.js, SQL, Git и ИИ. Каждую работу проверяет преподаватель.",
    keywords: [
      "курсы программирования",
      "IT курсы",
      "курсы веб-разработки",
      "frontend курсы",
      "backend курсы",
      "курсы HTML и CSS",
      "курсы JavaScript",
      "курсы React",
      "курсы Node.js",
      "курсы SQL",
      "онлайн курсы программирования",
      "офлайн курсы программирования",
      "программирование с нуля",
      "обучение программированию Узбекистан",
      "codov",
    ],
    ogLocale: "ru_RU",
  },
};

export const LANDING_PATHS: Record<Locale, string> = { uz: "/", ru: "/ru" };

/** Metadata for the public page in one language, with links to the other language version. */
export function landingMetadata(locale: Locale): Metadata {
  const seo = SEO[locale];
  const url = `${SITE_URL}${LANDING_PATHS[locale]}`;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: LANDING_PATHS[locale],
      languages: { uz: "/", ru: "/ru", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "codov",
      title: seo.title,
      description: seo.description,
      locale: seo.ogLocale,
      alternateLocale: [locale === "uz" ? SEO.ru.ogLocale : SEO.uz.ogLocale],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: seo.title }],
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: ["/og.png"] },
  };
}
