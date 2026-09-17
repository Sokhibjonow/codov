"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { pollChatEvents } from "@/lib/chat/actions";
import type { ChatEvent, ClientChatEvent, StreamHello } from "@/lib/chat/types";

type Listener = (event: ClientChatEvent) => void;
type RealtimeContextValue = { subscribe: (listener: Listener) => () => void; connected: boolean };

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** How long to wait for the stream's first event before assuming a proxy is holding it back */
const HELLO_TIMEOUT_MS = 6000;
/** Polling pace: fast only while a chat is on screen, to keep requests (and hosting limits) low */
const POLL_CHAT_MS = 3000;
const POLL_VISIBLE_MS = 20_000;
const POLL_HIDDEN_MS = 60_000;
const SEEN_LIMIT = 1000;

/**
 * One live connection per tab, shared by the chat page and the unread badges.
 * Uses Server-Sent Events; when they can't get through (Cloudflare quick tunnels, some school or
 * mobile proxies) it falls back to polling. Events are de-duplicated either way.
 * `polling` skips the stream entirely (Vercel functions can't hold connections open).
 */
export function RealtimeProvider({ children, polling = false }: { children: ReactNode; polling?: boolean }) {
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(true);
  const pathname = usePathname();
  const onChat = useRef(false);
  const pollNow = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wasOnChat = onChat.current;
    onChat.current = pathname.endsWith("/chat");
    if (onChat.current && !wasOnChat) pollNow.current?.();
  }, [pathname]);

  useEffect(() => {
    const seen = new Set<string>();
    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let since = new Date(Date.now() - 5000).toISOString();

    const emit = (event: ClientChatEvent) => listeners.current.forEach((listener) => listener(event));
    const deliver = (event: ChatEvent) => {
      if (event.type === "notification") return emit(event);
      const key =
        event.type === "message" ? `m:${event.message.id}` : event.type === "deleted" ? `d:${event.messageId}` : `r:${event.chatId}:${event.userId}:${event.lastReadAt}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string);
      emit(event);
    };

    const poll = async () => {
      if (disposed) return;
      try {
        const result = await pollChatEvents(since);
        since = result.now;
        result.events.forEach(deliver);
        setConnected(true);
      } catch {
        setConnected(false);
      }
      if (disposed) return;
      const delay = document.visibilityState !== "visible" ? POLL_HIDDEN_MS : onChat.current ? POLL_CHAT_MS : POLL_VISIBLE_MS;
      pollTimer = setTimeout(poll, delay);
    };

    let pollingStarted = false;
    const startPolling = () => {
      pollingStarted = true;
      void poll();
    };
    // Coming back to the tab or opening the chat: check right away instead of waiting
    pollNow.current = () => {
      if (!pollingStarted || disposed) return;
      if (pollTimer) clearTimeout(pollTimer);
      void poll();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") pollNow.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (polling) {
      startPolling();
      return () => {
        disposed = true;
        pollNow.current = null;
        if (pollTimer) clearTimeout(pollTimer);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    const source = new EventSource("/api/chat/stream");
    let opened = false;
    let streamWorks = false;

    const helloTimer = setTimeout(() => {
      if (streamWorks) return;
      source.close();
      startPolling();
    }, HELLO_TIMEOUT_MS);

    source.onopen = () => {
      // After a drop, listeners reload what they might have missed
      if (opened && streamWorks) emit({ type: "reconnected" });
      opened = true;
    };
    source.onerror = () => {
      if (streamWorks) setConnected(false);
    };
    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as ChatEvent | StreamHello;
        if (data.type === "hello") {
          streamWorks = true;
          setConnected(true);
          return;
        }
        deliver(data);
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      disposed = true;
      pollNow.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(helloTimer);
      if (pollTimer) clearTimeout(pollTimer);
      source.close();
    };
  }, [polling]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ subscribe, connected }), [subscribe, connected]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Calls `handler` for every live event; returns whether the connection is up. */
export function useRealtime(handler: Listener) {
  const context = useContext(RealtimeContext);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => context?.subscribe((event) => handlerRef.current(event)), [context]);

  return context?.connected ?? true;
}
