import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getDictionary } from "@/i18n/server";
import { landingMetadata } from "@/lib/seo";
import { getSession } from "@/lib/session";
import { homePathFor } from "@/lib/session-token";
import { getThemeMode } from "@/lib/theme-server";

export const metadata: Metadata = landingMetadata("ru");

/** Russian public page (the proxy fixes the language for this address). */
export default async function RussianHome() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.role));

  const [{ locale, t }, theme] = await Promise.all([getDictionary(), getThemeMode()]);
  return <Landing t={t} locale={locale} theme={theme} />;
}
