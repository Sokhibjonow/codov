import type { ChatEvent } from "./types";

// In-process publish/subscribe for live chat events. The site runs as one server process,
// so live connections (/api/chat/stream) and server actions share this registry.

type Listener = (event: ChatEvent) => void;

const store = globalThis as unknown as { __cubickChatBus?: Map<string, Set<Listener>> };
const listeners = (store.__cubickChatBus ??= new Map<string, Set<Listener>>());

export function subscribe(userId: string, listener: Listener) {
  const set = listeners.get(userId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(userId);
  };
}

export function publish(userIds: Iterable<string>, event: ChatEvent) {
  for (const userId of new Set(userIds)) {
    for (const listener of listeners.get(userId) ?? []) {
      try {
        listener(event);
      } catch {
        // A broken connection must not stop delivery to the others
      }
    }
  }
}
