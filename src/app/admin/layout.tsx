import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/NavLinks";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("ADMIN");
  const { t } = await getDictionary();

  const nav: NavItem[] = [
    { href: "/admin", label: t.nav.dashboard, icon: <LayoutDashboard size={18} />, exact: true },
    { href: "/admin/groups", label: t.nav.groups, icon: <UsersRound size={18} /> },
    { href: "/admin/students", label: t.nav.students, icon: <GraduationCap size={18} /> },
    { href: "/admin/parents", label: t.nav.parents, icon: <HeartHandshake size={18} /> },
    { href: "/admin/courses", label: t.nav.courses, icon: <BookOpen size={18} /> },
    { href: "/admin/submissions", label: t.nav.submissions, icon: <ClipboardCheck size={18} /> },
    { href: "/admin/leads", label: t.nav.leads, icon: <Inbox size={18} /> },
    { href: "/admin/stats", label: t.nav.stats, icon: <BarChart3 size={18} /> },
    { href: "/admin/chat", label: t.nav.chat, icon: <MessageCircle size={18} /> },
  ];

  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  );
}
