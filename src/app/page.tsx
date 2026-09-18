import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getDictionary } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { homePathFor } from "@/lib/session-token";
import { getThemeMode } from "@/lib/theme-server";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Signed-in users go straight to their cabinet; everyone else sees the public page. */
export default async function Home() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.role));

  const [{ locale, t }, theme] = await Promise.all([getDictionary(), getThemeMode()]);
  return <Landing t={t} locale={locale} theme={theme} />;
}
