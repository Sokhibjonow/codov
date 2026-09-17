import { LayoutDashboard, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/NavLinks";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("PARENT");
  const { t } = await getDictionary();

  // The dashboard is the children's progress; details open per child
  const nav: NavItem[] = [
    { href: "/parent", label: t.progress.title, icon: <LayoutDashboard size={18} />, exact: true },
    { href: "/parent/chat", label: t.nav.chat, icon: <MessageCircle size={18} /> },
  ];

  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  );
}
