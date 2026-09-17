import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import { getLocale } from "@/i18n/server";
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
  title: {
    default: "codov",
    template: "%s · codov",
  },
  description: "HTML, CSS, JavaScript",
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
      data-theme={theme === "system" ? undefined : theme}
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
