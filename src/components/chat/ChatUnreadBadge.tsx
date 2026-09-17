"use client";

import { useRef, useState } from "react";
import { getUnreadTotal } from "@/lib/chat/actions";
import { useRealtime } from "@/components/realtime/RealtimeProvider";

/** Unread message counter next to "Chat" in the menu, kept up to date live. */
export function ChatUnreadBadge({ initial, userId }: { initial: number; userId: string }) {
  const [count, setCount] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRealtime((event) => {
    if (event.type === "notification") return;
    if (event.type === "message" && event.message.senderId === userId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => setCount(await getUnreadTotal()), 400);
  });

  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-danger px-1.5 text-center text-xs font-bold leading-5 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
