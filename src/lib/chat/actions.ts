"use server";

import { after } from "next/server";
import { kickAiQueue } from "../ai/queue";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { publish } from "./bus";
import {
  chatRecipients,
  ensureDirectChat,
  ensureUserChats,
  loadChatForUser,
  loadMessagesPage,
  messageSelect,
  toMessageDTO,
  unreadTotal,
  visibleChatsWhere,
} from "./data";
import { MESSAGE_MAX_LENGTH, type ChatEvent, type ChatMessageDTO } from "./types";

// Chat actions shared by the teacher, students and parents.

const RATE_WINDOW_MS = 20_000;
const RATE_MAX = 15;
const store = globalThis as unknown as { __cubickChatRate?: Map<string, number[]>; __cubickAiKickAt?: number };
const sent = (store.__cubickChatRate ??= new Map<string, number[]>());

function withinRate(userId: string) {
  const now = Date.now();
  const recent = (sent.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) return false;
  recent.push(now);
  sent.set(userId, recent);
  return true;
}

export type SendResult = { ok: true; message: ChatMessageDTO } | { ok: false; error: "empty" | "tooFast" | "forbidden" };

export async function sendMessage(chatId: string, rawText: string): Promise<SendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "forbidden" };

  const text = (typeof rawText === "string" ? rawText : "").replace(/\r\n?/g, "\n").trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!text) return { ok: false, error: "empty" };

  const chat = await loadChatForUser(user, chatId);
  if (!chat) return { ok: false, error: "forbidden" };
  if (!withinRate(user.id)) return { ok: false, error: "tooFast" };

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { chatId, senderId: user.id, text }, select: messageSelect }),
    prisma.chat.update({ where: { id: chatId }, data: { lastMessageAt: now } }),
    prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      create: { chatId, userId: user.id, lastReadAt: now },
      update: { lastReadAt: now },
    }),
  ]);

  const dto = toMessageDTO(message);
  publish(await chatRecipients(chat), { type: "message", message: dto });
  return { ok: true, message: dto };
}

export async function markChatRead(chatId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const chat = await loadChatForUser(user, chatId);
  if (!chat) return;

  const now = new Date();
  await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId, userId: user.id } },
    create: { chatId, userId: user.id, lastReadAt: now },
    update: { lastReadAt: now },
  });

  // Direct chats show "read" to the other person; everyone's own tabs update their unread counters
  const recipients = chat.type === "DIRECT" ? chat.members.map((m) => m.userId) : [user.id];
  publish(recipients, { type: "read", chatId, userId: user.id, lastReadAt: now.toISOString() });
}

export async function loadMessages(chatId: string, beforeIso?: string) {
  const user = await getCurrentUser();
  if (!user || !(await loadChatForUser(user, chatId))) return null;
  const before = beforeIso ? new Date(beforeIso) : undefined;
  return loadMessagesPage(chatId, before && !Number.isNaN(before.getTime()) ? before : undefined, user.role === "ADMIN");
}

export async function deleteMessage(messageId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const message = await prisma.message.findUnique({ where: { id: messageId }, select: { chatId: true, senderId: true, deletedAt: true } });
  if (!message || message.deletedAt) return;
  // Own messages, or any message for the teacher (moderation in group chats)
  if (message.senderId !== user.id && user.role !== "ADMIN") return;

  const chat = await loadChatForUser(user, message.chatId);
  if (!chat) return;

  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
  publish(await chatRecipients(chat), { type: "deleted", chatId: chat.id, messageId });
}

/** Teacher ↔ student/parent direct chat, created when it doesn't exist yet. */
export async function openDirectChat(otherUserId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const other = await prisma.user.findFirst({ where: { id: otherUserId, isActive: true }, select: { id: true, role: true } });
  if (!other || other.id === user.id) return null;
  const allowed = user.role === "ADMIN" ? other.role !== "ADMIN" : other.role === "ADMIN";
  if (!allowed) return null;

  return ensureDirectChat(user.id, other.id);
}

const POLL_MAX_LOOKBACK_MS = 10 * 60_000;

/**
 * Fallback when the live stream can't get through (e.g. a proxy that buffers Server-Sent Events):
 * returns the chat events since `sinceIso`, rebuilt from the database.
 */
export async function pollChatEvents(sinceIso: string): Promise<{ events: ChatEvent[]; now: string }> {
  const now = new Date();
  const user = await getCurrentUser();
  if (!user) return { events: [], now: now.toISOString() };

  const requested = new Date(sinceIso);
  const since = new Date(Math.max(Number.isNaN(requested.getTime()) ? 0 : requested.getTime(), now.getTime() - POLL_MAX_LOOKBACK_MS));

  await ensureUserChats(user);
  const chats = await prisma.chat.findMany({
    where: { AND: [visibleChatsWhere(user), { members: { some: { userId: user.id } } }] },
    select: { id: true },
  });
  const chatIds = chats.map((c) => c.id);

  const [messages, reads, newNotifications] = await Promise.all([
    prisma.message.findMany({
      where: { chatId: { in: chatIds }, OR: [{ createdAt: { gt: since, lte: now } }, { deletedAt: { gt: since, lte: now } }] },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: messageSelect,
    }),
    prisma.chatMember.findMany({
      where: { chatId: { in: chatIds }, lastReadAt: { gt: since, lte: now }, chat: { type: "DIRECT" } },
      select: { chatId: true, userId: true, lastReadAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, createdAt: { gt: since, lte: now } } }),
  ]);

  const events: ChatEvent[] = [];
  for (const row of messages) {
    if (row.createdAt > since) events.push({ type: "message", message: toMessageDTO(row, user.role === "ADMIN") });
    if (row.deletedAt && row.deletedAt > since) events.push({ type: "deleted", chatId: row.chatId, messageId: row.id });
  }
  for (const read of reads) {
    events.push({ type: "read", chatId: read.chatId, userId: read.userId, lastReadAt: read.lastReadAt!.toISOString() });
  }
  if (newNotifications > 0) events.push({ type: "notification" });

  // While the teacher is online, reviews left in the queue get picked up (needed on Vercel)
  if (user.role === "ADMIN" && Date.now() - (store.__cubickAiKickAt ?? 0) > 60_000) {
    store.__cubickAiKickAt = Date.now();
    after(() => kickAiQueue());
  }
  return { events, now: now.toISOString() };
}

export async function getUnreadTotal() {
  const user = await getCurrentUser();
  return user ? unreadTotal(user.id) : 0;
}
