import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { Avatar } from "@/components/Avatar";
import { ChatUnreadBadge } from "@/components/chat/ChatUnreadBadge";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { ensureUserChats, unreadTotal } from "@/lib/chat/data";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ensureDeadlineReminders, unreadNotificationCount } from "@/lib/notifications";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { getDictionary } from "@/i18n/server";
import type { CurrentUser } from "@/lib/auth";
import { MobileNav } from "./MobileNav";
import { NavLinks, type NavItem } from "./NavLinks";

type AppShellProps = {
  user: CurrentUser;
  nav: NavItem[];
  children: ReactNode;
};

export async function AppShell({ user, nav: items, children }: AppShellProps) {
  const { locale, t } = await getDictionary();
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const home = items[0]?.href ?? "/";

  await ensureUserChats(user);
  const unread = await unreadTotal(user.id);
  if (user.role === "STUDENT") await ensureDeadlineReminders(user.id);
  const unreadNotifications = await unreadNotificationCount(user.id);
  const bell = (placement: "sidebar" | "header") => (
    <NotificationBell t={{ notifications: t.notifications }} locale={locale} role={user.role} initialUnread={unreadNotifications} placement={placement} />
  );
  const nav = items.map((item) =>
    item.href.endsWith("/chat") ? { ...item, badge: <ChatUnreadBadge initial={unread} userId={user.id} /> } : item,
  );

  const account = (
    <div className="space-y-3">
      <LanguageSwitcher current={locale} label={t.common.language} />
      <div className="flex items-center gap-3">
        <Avatar name={fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{fullName}</p>
          <p className="text-xs text-muted">{t.roles[user.role]}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="btn btn-ghost p-2" title={t.common.logout} aria-label={t.common.logout}>
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <RealtimeProvider polling={Boolean(process.env.VERCEL)}>
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <Link href={home}>
            <Logo />
          </Link>
          {bell("sidebar")}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks items={nav} />
        </nav>
        <div className="border-t border-border p-4">{account}</div>
      </aside>

      <MobileNav home={home} menuLabel={t.nav.menu} footer={account} actions={bell("header")}>
        <NavLinks items={nav} />
      </MobileNav>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
    </RealtimeProvider>
  );
}
