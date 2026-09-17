import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ChatPeer } from "@/lib/chat/types";
import { formatDayMonth } from "@/lib/format";

const TIME_ZONE = "Asia/Tashkent";
// Numeric dates and times look the same in both languages (15.09.2026, 14:30)
const NUMERIC_LOCALE = "ru-RU";

/** "2026-09-16" in Tashkent time, for grouping messages by day */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(NUMERIC_LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

export function dayLabel(iso: string, locale: Locale, t: Dictionary) {
  const key = dayKey(iso);
  const now = Date.now();
  if (key === dayKey(new Date(now).toISOString())) return t.chat.today;
  if (key === dayKey(new Date(now - 86_400_000).toISOString())) return t.chat.yesterday;
  return formatDayMonth(new Date(iso), locale);
}

/** Time for today's messages, date for older ones (chat list) */
export function listTime(iso: string) {
  if (dayKey(iso) === dayKey(new Date().toISOString())) return formatTime(iso);
  return new Intl.DateTimeFormat(NUMERIC_LOCALE, { day: "2-digit", month: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

type ChatLike = { type: "DIRECT" | "GROUP"; groupName: string | null; peer: ChatPeer | null };

export function chatTitle(t: Dictionary, chat: ChatLike) {
  return chat.type === "GROUP" ? (chat.groupName ?? t.chat.groupChat) : (chat.peer?.name ?? "—");
}

export function chatSubtitle(t: Dictionary, chat: ChatLike) {
  if (chat.type === "GROUP") return t.chat.groupChat;
  const peer = chat.peer;
  if (!peer) return "";
  if (peer.role === "ADMIN") return t.chat.teacher;
  const role = t.roles[peer.role];
  return peer.details.length ? `${role} · ${peer.details.join(", ")}` : role;
}
