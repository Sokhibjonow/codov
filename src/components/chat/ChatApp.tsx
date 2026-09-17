"use client";

import { Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ChatContact, ChatSummaryDTO, ChatThreadDTO } from "@/lib/chat/types";
import type { Role } from "@/lib/session-token";
import { chatSubtitle, chatTitle, listTime } from "./chat-format";
import { ChatThread } from "./ChatThread";
import { NewChatDialog } from "./NewChatDialog";

type ChatAppProps = {
  t: Dictionary;
  locale: Locale;
  me: { id: string; role: Role };
  chats: ChatSummaryDTO[];
  thread: ChatThreadDTO | null;
  contacts: ChatContact[];
  basePath: string;
};

export function ChatApp({ t, locale, me, chats: initialChats, thread, contacts, basePath }: ChatAppProps) {
  const router = useRouter();
  const [chats, setChats] = useState(initialChats);
  const [syncedFrom, setSyncedFrom] = useState(initialChats);
  const [query, setQuery] = useState("");
  const activeId = thread?.id ?? null;

  // A server refresh brings a new list (e.g. a chat that didn't exist before)
  if (syncedFrom !== initialChats) {
    setSyncedFrom(initialChats);
    setChats(initialChats);
  }

  useRealtime((event) => {
    switch (event.type) {
      case "reconnected":
        router.refresh();
        return;
      case "message": {
        const { message } = event;
        const current = chats.find((c) => c.id === message.chatId);
        if (!current) {
          router.refresh();
          return;
        }
        const countsAsUnread = message.senderId !== me.id && message.chatId !== activeId;
        const updated = { ...current, lastMessage: message, lastActivityAt: message.createdAt, unread: current.unread + (countsAsUnread ? 1 : 0) };
        setChats((list) => [updated, ...list.filter((c) => c.id !== message.chatId)]);
        return;
      }
      case "read":
        if (event.userId === me.id) setChats((list) => list.map((c) => (c.id === event.chatId ? { ...c, unread: 0 } : c)));
        return;
      case "deleted":
        setChats((list) =>
          list.map((c) =>
            c.lastMessage?.id === event.messageId
              ? { ...c, lastMessage: { ...c.lastMessage, text: me.role === "ADMIN" ? c.lastMessage.text : "", deleted: true } }
              : c,
          ),
        );
    }
  });

  const markActiveRead = useCallback(() => {
    setChats((list) => list.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
  }, [activeId]);

  const q = query.trim().toLowerCase();
  const visible = chats.filter((chat) => !q || `${chatTitle(t, chat)} ${chatSubtitle(t, chat)}`.toLowerCase().includes(q));

  const preview = (chat: ChatSummaryDTO) => {
    const last = chat.lastMessage;
    if (!last) return <span className="italic">{t.chat.noMessagesYet}</span>;
    const author = last.senderId === me.id ? `${t.chat.you}: ` : chat.type === "GROUP" ? `${last.senderName.split(" ").pop()}: ` : "";
    return last.deleted ? (
      <span className="italic">
        {t.chat.deleted}
        {last.text && <span className="line-through">: {last.text}</span>}
      </span>
    ) : (
      <>
        {author}
        {last.text}
      </>
    );
  };

  return (
    <div className="card flex h-[calc(100dvh-7rem)] overflow-hidden p-0 md:h-[calc(100dvh-4rem)]">
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-border md:w-80 md:shrink-0 md:border-r`}>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t.chat.search}</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.chat.search} className="input py-2 pl-9" />
          </label>
          {me.role === "ADMIN" && <NewChatDialog t={t} contacts={contacts} basePath={basePath} />}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">{t.chat.noChats}</li>}
          {visible.map((chat) => {
            const title = chatTitle(t, chat);
            const active = chat.id === activeId;
            return (
              <li key={chat.id}>
                <Link
                  href={`${basePath}?c=${chat.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors ${active ? "bg-primary-soft" : "hover:bg-background"}`}
                >
                  {chat.type === "GROUP" ? (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <UsersRound size={20} />
                    </span>
                  ) : (
                    <Avatar name={title} size={44} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-bold">{title}</span>
                      <span className="shrink-0 text-[11px] text-muted">{chat.lastMessage && listTime(chat.lastActivityAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-muted">{preview(chat)}</span>
                      {chat.unread > 0 && (
                        <span className="min-w-5 shrink-0 rounded-full bg-primary px-1.5 text-center text-xs font-bold leading-5 text-on-color">
                          {chat.unread > 99 ? "99+" : chat.unread}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted/80">{chatSubtitle(t, chat)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {thread ? (
          <ChatThread key={thread.id} t={t} locale={locale} me={me} thread={thread} basePath={basePath} onRead={markActiveRead} />
        ) : (
          <p className="m-auto px-6 text-center text-muted">{t.chat.selectChat}</p>
        )}
      </section>
    </div>
  );
}
