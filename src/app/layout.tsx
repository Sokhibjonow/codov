import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import { getLocale } from "@/i18n/server";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { themeScript } from "@/lib/theme";
import { getThemeMode } from "@/lib/theme-server";
// Code highlighting theme for lesson Markdown (see components/markdown)
import "highlight.js/styles/github-dark.min.css";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · codov",
  },
  description: SITE_DESCRIPTION,
  applicationName: "codov",
  // Google ignores keywords, but some other search engines and catalogs still read them
  keywords: [
    "codov",
    "HTML o‘rganish",
    "CSS darslari",
    "JavaScript kurslari",
    "dasturlash kurslari",
    "veb-dasturlash",
    "frontend kurs",
    "dasturlash Toshkent",
    "IT kurslar O‘zbekiston",
    "курсы HTML",
    "курсы CSS",
    "курсы JavaScript",
    "обучение программированию Ташкент",
    "веб-разработка для начинающих",
    "frontend курсы Узбекистан",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "codov",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "uz_UZ",
    alternateLocale: ["ru_RU"],
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "codov — HTML, CSS, JavaScript" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  // Google Search Console ownership check (the code from the "HTML tag" method)
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1320" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getThemeMode()]);

  return (
    <html
      lang={locale}
      data-theme={theme ?? undefined}
      // The inline script sets data-theme before React loads
      suppressHydrationWarning
      className={`${nunito.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
