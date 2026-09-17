import { BookOpen, ClipboardList, LayoutDashboard, MessageCircle, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/NavLinks";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("STUDENT");
  const { t } = await getDictionary();

  const nav: NavItem[] = [
    { href: "/student", label: t.nav.dashboard, icon: <LayoutDashboard size={18} />, exact: true },
    { href: "/student/courses", label: t.nav.courses, icon: <BookOpen size={18} /> },
    { href: "/student/assignments", label: t.nav.assignments, icon: <ClipboardList size={18} /> },
    { href: "/student/progress", label: t.nav.progress, icon: <TrendingUp size={18} /> },
    { href: "/student/chat", label: t.nav.chat, icon: <MessageCircle size={18} /> },
  ];

  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  );
}
