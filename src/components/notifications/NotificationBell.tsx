"use client";

import { Bell, CalendarX, CheckCheck, CheckCircle2, ClipboardCheck, ClipboardList, Clock, Inbox, Loader2, Undo2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { format, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { formatDateTime, formatDay, formatRelative } from "@/lib/format";
import { pick } from "@/lib/learning-text";
import { formatPhone } from "@/lib/phone";
import { getNotifications, markNotificationsRead } from "@/lib/notification-actions";
import type { NotificationItem } from "@/lib/notifications";
import type { Role } from "@/lib/session-token";

type Described = { text: string; href: string; icon: LucideIcon; tone: string };

function describe(t: Pick<Dictionary, "notifications">, locale: Locale, role: Role, item: NotificationItem): Described | null {
  const tn = t.notifications;
  // Notifications saved before titles were stored only had a combined `title`
  const title = (d: { titleUz?: string; titleRu?: string; title?: string }) => pick(locale, d.titleUz ?? "", d.titleRu ?? "") || d.title || "";

  switch (item.type) {
    case "submission.new":
      return {
        text: format(tn.submissionNew, { student: item.data.studentName ?? "", title: title(item.data) }),
        href: item.data.submissionId ? `/admin/submissions/${item.data.submissionId}` : "/admin/submissions",
        icon: ClipboardCheck,
        tone: "text-primary",
      };
    case "submission.reviewed": {
      const d = item.data;
      const accepted = d.status === "ACCEPTED";
      const vars = { title: title(d), score: d.score ?? "—", max: d.maxScore ?? 100, child: d.childName ?? "" };
      const template = d.childName
        ? accepted ? tn.childReviewedAccepted : tn.childReviewedReturned
        : accepted ? tn.reviewedAccepted : tn.reviewedReturned;
      return {
        text: format(template, vars),
        href: role === "PARENT" && d.childId ? `/parent/children/${d.childId}` : `/student/assignments/${d.assignmentId}`,
        icon: accepted ? CheckCircle2 : Undo2,
        tone: accepted ? "text-success" : "text-danger",
      };
    }
    case "assignment.new":
      return {
        text: format(tn.assignmentNew, { title: title(item.data) }),
        href: `/student/assignments/${item.data.assignmentId}`,
        icon: ClipboardList,
        tone: "text-primary",
      };
    case "deadline.soon":
      return {
        text: format(tn.deadlineSoon, { title: title(item.data), date: formatDateTime(new Date(item.data.dueAt), locale) }),
        href: `/student/assignments/${item.data.assignmentId}`,
        icon: Clock,
        tone: "text-warning",
      };
    case "attendance.absent":
      return {
        text: format(tn.attendanceAbsent, {
          child: item.data.childName,
          date: formatDay(item.data.date, locale, { day: "numeric", month: "long" }),
          group: item.data.groupName,
        }),
        href: `/parent/children/${item.data.childId}`,
        icon: CalendarX,
        tone: "text-danger",
      };
    case "lead.new":
      return {
        text: format(tn.leadNew, { name: item.data.name, phone: formatPhone(item.data.phone) }),
        href: "/admin/leads",
        icon: Inbox,
        tone: "text-primary",
      };
    default:
      return null;
  }
}

// The bell is rendered twice (desktop sidebar and mobile header); both copies share the unread count.
const SYNC_EVENT = "cubick:notifications-unread";

function shareUnread(count: number) {
  window.dispatchEvent(new CustomEvent<number>(SYNC_EVENT, { detail: count }));
}

type NotificationBellProps = {
  t: Pick<Dictionary, "notifications">;
  locale: Locale;
  role: Role;
  initialUnread: number;
  /** Where the panel opens: next to the sidebar logo or from the mobile header */
  placement: "sidebar" | "header";
};

export function NotificationBell({ t, locale, role, initialUnread, placement }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const result = await getNotifications();
    setItems(result.items);
    setUnread(result.unread);
    shareUnread(result.unread);
  };

  useEffect(() => {
    const onSync = (event: Event) => setUnread((event as CustomEvent<number>).detail);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  useRealtime((event) => {
    if (event.type === "notification" || event.type === "reconnected") void refresh();
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((value) => !value);
    if (!open) void refresh();
  };

  const openItem = (item: NotificationItem, href: string) => {
    if (!item.read) {
      setItems((list) => list?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? null);
      shareUnread(Math.max(0, unread - 1));
      void markNotificationsRead([item.id]);
    }
    setOpen(false);
    router.push(href);
  };

  const markAll = async () => {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    shareUnread(0);
    await markNotificationsRead();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t.notifications.title}
        title={t.notifications.title}
        className="btn btn-ghost relative p-2"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-5 text-on-color">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`z-50 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ${
            placement === "sidebar" ? "absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)]" : "fixed inset-x-2 top-14 mt-1"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="font-extrabold">{t.notifications.title}</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="btn btn-ghost px-2 py-1 text-xs">
                <CheckCheck size={14} />
                {t.notifications.markAllRead}
              </button>
            )}
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {items === null && (
              <li className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted" />
              </li>
            )}
            {items?.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">{t.notifications.empty}</li>}
            {items?.map((item) => {
              const described = describe(t, locale, role, item);
              if (!described) return null;
              const Icon = described.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item, described.href)}
                    className={`flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-background ${
                      item.read ? "" : "bg-primary-soft/40"
                    }`}
                  >
                    <Icon size={18} className={`mt-0.5 shrink-0 ${described.tone}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${item.read ? "" : "font-bold"}`}>{described.text}</span>
                      <span className="block text-xs text-muted">{formatRelative(item.createdAt, locale)}</span>
                    </span>
                    {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
