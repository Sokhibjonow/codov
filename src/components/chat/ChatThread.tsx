"use client";

import { AlertCircle, ArrowLeft, CheckCheck, Clock, Loader2, SendHorizontal, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { format, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { deleteMessage, loadMessages, markChatRead, sendMessage } from "@/lib/chat/actions";
import { MESSAGE_MAX_LENGTH, type ChatMessageDTO, type ChatThreadDTO } from "@/lib/chat/types";
import type { Role } from "@/lib/session-token";
import { chatSubtitle, chatTitle, dayKey, dayLabel, formatTime } from "./chat-format";

type ThreadMessage = ChatMessageDTO & { status?: "sending" | "failed"; error?: string };

type ChatThreadProps = {
  t: Dictionary;
  locale: Locale;
  me: { id: string; role: Role };
  thread: ChatThreadDTO;
  basePath: string;
  onRead: () => void;
};

const URL_PATTERN = /(https?:\/\/[^\s<>"]+)/g;

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function ChatThread({ t, locale, me, thread, basePath, onRead }: ChatThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>(thread.messages);
  const [hasMore, setHasMore] = useState(thread.hasMore);
  const [readBy, setReadBy] = useState(thread.readBy);
  const [text, setText] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const restoreFromHeight = useRef<number | null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadRef = useRef(onRead);

  useEffect(() => {
    onReadRef.current = onRead;
  });

  const scheduleRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      void markChatRead(thread.id);
      onReadRef.current();
    }, 300);
  }, [thread.id]);

  useEffect(() => {
    scheduleRead();
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [scheduleRead]);

  const connected = useRealtime(async (event) => {
    switch (event.type) {
      case "message":
        if (event.message.chatId !== thread.id) return;
        setMessages((list) => (list.some((m) => m.id === event.message.id) ? list : [...list, event.message]));
        if (event.message.senderId !== me.id) scheduleRead();
        return;
      case "deleted":
        if (event.chatId !== thread.id) return;
        // The teacher keeps seeing the text of deleted messages
        setMessages((list) =>
          list.map((m) => (m.id === event.messageId ? { ...m, text: me.role === "ADMIN" ? m.text : "", deleted: true } : m)),
        );
        return;
      case "read":
        if (event.chatId === thread.id && event.userId !== me.id) setReadBy((current) => ({ ...current, [event.userId]: event.lastReadAt }));
        return;
      case "reconnected": {
        // Reload the latest page in case messages arrived while the connection was down
        const page = await loadMessages(thread.id);
        if (!page) return;
        setHasMore(page.hasMore);
        setMessages((list) => {
          const ids = new Set(page.messages.map((m) => m.id));
          const firstLoaded = page.messages[0]?.createdAt ?? "";
          const older = list.filter((m) => !m.status && !ids.has(m.id) && m.createdAt < firstLoaded);
          const pending = list.filter((m) => m.status);
          return [...older, ...page.messages, ...pending];
        });
        scheduleRead();
      }
    }
  });

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (restoreFromHeight.current !== null) {
      el.scrollTop = el.scrollHeight - restoreFromHeight.current;
      restoreFromHeight.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const loadOlder = async () => {
    const first = messages.find((m) => !m.status);
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const page = await loadMessages(thread.id, first.createdAt);
    setLoadingOlder(false);
    if (!page) return;
    restoreFromHeight.current = listRef.current?.scrollHeight ?? null;
    setHasMore(page.hasMore);
    setMessages((list) => [...page.messages.filter((m) => !list.some((x) => x.id === m.id)), ...list]);
  };

  const send = async (value: string, replaceId?: string) => {
    const body = value.trim();
    if (!body) return;
    const tempId = replaceId ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const temp: ThreadMessage = {
      id: tempId,
      chatId: thread.id,
      senderId: me.id,
      senderName: "",
      senderRole: me.role,
      text: body,
      createdAt: new Date().toISOString(),
      deleted: false,
      status: "sending",
    };
    stickToBottom.current = true;
    setMessages((list) => (replaceId ? list.map((m) => (m.id === replaceId ? temp : m)) : [...list, temp]));

    const result = await sendMessage(thread.id, body).catch(() => null);
    if (result?.ok) {
      setMessages((list) =>
        list.some((m) => m.id === result.message.id)
          ? list.filter((m) => m.id !== tempId)
          : list.map((m) => (m.id === tempId ? result.message : m)),
      );
    } else {
      const error = result && !result.ok && result.error === "tooFast" ? t.chat.tooFast : t.chat.failed;
      setMessages((list) => list.map((m) => (m.id === tempId ? { ...m, status: "failed", error } : m)));
    }
  };

  const submit = () => {
    const value = text;
    if (!value.trim()) return;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "";
    void send(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // On phones Enter adds a new line; the send button sends
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !touch) {
      event.preventDefault();
      submit();
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.chat.deleteConfirm)) return;
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, text: me.role === "ADMIN" ? m.text : "", deleted: true } : m)));
    await deleteMessage(id);
  };

  const lastMineIndex = messages.findLastIndex((m) => m.senderId === me.id && !m.status && !m.deleted);
  const title = chatTitle(t, thread);
  const subtitle = thread.type === "GROUP" ? format(t.chat.members, { count: thread.memberCount }) : chatSubtitle(t, thread);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Link href={basePath} className="btn btn-ghost p-2 md:hidden" aria-label={t.chat.back}>
          <ArrowLeft size={20} />
        </Link>
        {thread.type === "GROUP" ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <UsersRound size={20} />
          </span>
        ) : (
          <Avatar name={title} size={40} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{title}</p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
        {!connected && <span className="text-xs font-semibold text-warning">{t.chat.reconnecting}</span>}
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-background/60 px-3 py-4"
      >
        {hasMore && (
          <div className="mb-3 text-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn btn-ghost px-3 py-1 text-xs">
              {loadingOlder && <Loader2 size={14} className="animate-spin" />}
              {t.chat.loadOlder}
            </button>
          </div>
        )}
        {messages.length === 0 && <p className="mt-10 text-center text-sm text-muted">{t.chat.empty}</p>}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
          const mine = message.senderId === me.id;
          const showSender = thread.type === "GROUP" && !mine && (newDay || previous?.senderId !== message.senderId);
          const canDelete = !message.deleted && !message.status && (mine || me.role === "ADMIN");
          const read =
            thread.type === "DIRECT" && index === lastMineIndex && Object.values(readBy).some((at) => at !== null && at >= message.createdAt);

          return (
            <div key={message.id}>
              {newDay && (
                <p className="my-3 text-center">
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted shadow-sm">{dayLabel(message.createdAt, locale, t)}</span>
                </p>
              )}
              <div className={`group mt-1 flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {canDelete && mine && (
                  <button
                    type="button"
                    onClick={() => remove(message.id)}
                    className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title={t.chat.delete}
                    aria-label={t.chat.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm sm:max-w-[70%] ${
                    mine ? "rounded-br-md bg-primary text-on-color" : "rounded-bl-md bg-surface"
                  } ${message.status === "failed" ? "cursor-pointer ring-2 ring-danger" : ""}`}
                  onClick={message.status === "failed" ? () => void send(message.text, message.id) : undefined}
                >
                  {showSender && (
                    <p className="mb-0.5 text-xs font-extrabold text-primary">
                      {message.senderName}
                      {message.senderRole === "ADMIN" && <span className="font-semibold text-muted"> · {t.chat.teacher}</span>}
                    </p>
                  )}
                  {message.deleted && message.text ? (
                    <>
                      <p className={`mb-0.5 text-[11px] font-bold italic ${mine ? "text-on-color/70" : "text-danger"}`}>{t.chat.deletedTeacherOnly}</p>
                      <p className={`whitespace-pre-wrap break-words line-through decoration-1 ${mine ? "text-on-color/60" : "text-muted"}`}>
                        {message.text}
                      </p>
                    </>
                  ) : message.deleted ? (
                    <p className={`italic ${mine ? "text-on-color/70" : "text-muted"}`}>{t.chat.deleted}</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      <Linkified text={message.text} />
                    </p>
                  )}
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-on-color/70" : "text-muted"}`}>
                    {message.status === "sending" && <Clock size={11} />}
                    {message.status === "failed" && <AlertCircle size={11} />}
                    {message.status === "failed" ? message.error : formatTime(message.createdAt)}
                    {read && (
                      <span className="flex items-center gap-0.5" title={t.chat.read}>
                        <CheckCheck size={13} />
                      </span>
                    )}
                  </p>
                </div>
                {canDelete && !mine && (
                  <button
                    type="button"
                    onClick={() => remove(message.id)}
                    className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title={t.chat.delete}
                    aria-label={t.chat.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border bg-surface p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={t.chat.placeholder}
          title={t.chat.enterHint}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={onKeyDown}
          className="input max-h-40 min-h-11 flex-1 resize-none py-2.5"
        />
        <button type="submit" disabled={!text.trim()} className="btn btn-primary size-11 shrink-0 p-0" aria-label={t.chat.send} title={t.chat.send}>
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
}
