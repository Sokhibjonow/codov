import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import type { Role } from "../session-token";
import { fullName } from "../users";
import { MESSAGES_PAGE, type ChatContact, type ChatMessageDTO, type ChatPeer, type ChatSummaryDTO, type ChatThreadDTO } from "./types";

type ChatUser = { id: string; role: Role };

/** One direct chat per pair of people, whatever order they come in. */
export function directKey(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}

/**
 * Finds or creates the direct chat of two users. Safe when called concurrently
 * (e.g. the menu and the chat page render at the same time): the unique key decides.
 */
export async function ensureDirectChat(userA: string, userB: string) {
  const key = directKey(userA, userB);
  const existing = await prisma.chat.findUnique({ where: { directKey: key }, select: { id: true } });
  if (existing) return existing.id;

  const now = new Date();
  try {
    const chat = await prisma.chat.create({
      data: {
        type: "DIRECT",
        directKey: key,
        members: { create: [{ userId: userA, lastReadAt: now }, { userId: userB, lastReadAt: now }] },
      },
      select: { id: true },
    });
    return chat.id;
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const created = await prisma.chat.findUnique({ where: { directKey: key }, select: { id: true } });
    if (!created) throw error;
    return created.id;
  }
}

export const messageSelect = {
  id: true,
  chatId: true,
  senderId: true,
  text: true,
  createdAt: true,
  deletedAt: true,
  sender: { select: { firstName: true, lastName: true, role: true } },
} satisfies Prisma.MessageSelect;

type MessageRow = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

/** `revealDeleted`: the teacher still sees what a deleted message said (moderation) */
export function toMessageDTO(row: MessageRow, revealDeleted = false): ChatMessageDTO {
  const deleted = row.deletedAt !== null;
  return {
    id: row.id,
    chatId: row.chatId,
    senderId: row.senderId,
    senderName: fullName(row.sender),
    senderRole: row.sender.role,
    // For everyone else the deleted text never leaves the server
    text: deleted && !revealDeleted ? "" : row.text,
    createdAt: row.createdAt.toISOString(),
    deleted,
  };
}

const peerUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  children: { select: { child: { select: { firstName: true, lastName: true } } } },
  groupMemberships: { where: { group: { isArchived: false } }, select: { group: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

function toPeer(user: Prisma.UserGetPayload<{ select: typeof peerUserSelect }>): ChatPeer {
  return {
    id: user.id,
    name: fullName(user),
    role: user.role,
    details:
      user.role === "PARENT"
        ? user.children.map((c) => fullName(c.child))
        : user.role === "STUDENT"
          ? user.groupMemberships.map((m) => m.group.name)
          : [],
  };
}

/**
 * Creates the chats a user should see: the group chats of their groups (teacher: all groups)
 * and, for students and parents, a direct chat with the teacher.
 */
export async function ensureUserChats(user: ChatUser) {
  const now = new Date();

  if (user.role === "ADMIN" || user.role === "STUDENT") {
    const groups = await prisma.group.findMany({
      where: { isArchived: false, ...(user.role === "STUDENT" && { members: { some: { userId: user.id } } }) },
      select: { id: true, chat: { select: { id: true, members: { where: { userId: user.id }, select: { userId: true } } } } },
    });

    const missingMemberships: string[] = [];
    for (const group of groups) {
      if (group.chat?.members.length) continue;
      const chat =
        group.chat ??
        (await prisma.chat.upsert({ where: { groupId: group.id }, create: { type: "GROUP", groupId: group.id }, update: {}, select: { id: true } }));
      missingMemberships.push(chat.id);
    }
    if (missingMemberships.length) {
      // New members start "read up to now" instead of seeing the whole history as unread
      await prisma.chatMember.createMany({
        data: missingMemberships.map((chatId) => ({ chatId, userId: user.id, lastReadAt: now })),
        skipDuplicates: true,
      });
    }
  }

  if (user.role === "STUDENT" || user.role === "PARENT") {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    const existing = await prisma.chat.findMany({
      where: { directKey: { in: admins.map((a) => directKey(user.id, a.id)) } },
      select: { directKey: true },
    });
    const have = new Set(existing.map((c) => c.directKey));
    for (const admin of admins) {
      if (!have.has(directKey(user.id, admin.id))) await ensureDirectChat(user.id, admin.id);
    }
  }
}

/** Chat the user may open; group chats are checked against the current group membership. */
export async function loadChatForUser(user: ChatUser, chatId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      type: true,
      groupId: true,
      group: { select: { name: true, isArchived: true, members: { where: { userId: user.id }, select: { userId: true } } } },
      members: { select: { userId: true, lastReadAt: true } },
    },
  });
  if (!chat) return null;
  if (chat.type === "DIRECT") return chat.members.some((m) => m.userId === user.id) ? chat : null;
  if (!chat.group || chat.group.isArchived) return null;
  if (user.role === "ADMIN") return chat;
  return user.role === "STUDENT" && chat.group.members.length > 0 ? chat : null;
}

type LoadedChat = NonNullable<Awaited<ReturnType<typeof loadChatForUser>>>;

/** Everyone who should receive live events of a chat. */
export async function chatRecipients(chat: LoadedChat) {
  if (chat.type === "DIRECT" || !chat.groupId) return chat.members.map((m) => m.userId);
  const [students, admins] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId: chat.groupId }, select: { userId: true } }),
    prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } }),
  ]);
  return [...students.map((s) => s.userId), ...admins.map((a) => a.id)];
}

export function visibleChatsWhere(user: ChatUser): Prisma.ChatWhereInput {
  const groupChat: Prisma.ChatWhereInput = {
    type: "GROUP",
    group: { isArchived: false, ...(user.role === "STUDENT" && { members: { some: { userId: user.id } } }) },
  };
  return user.role === "PARENT" ? { type: "DIRECT" } : { OR: [{ type: "DIRECT" }, groupChat] };
}

async function unreadByChat(userId: string) {
  const rows = await prisma.$queryRaw<{ chatId: string; unread: number }[]>`
    SELECT m."chatId" AS "chatId", COUNT(*)::int AS unread
    FROM "Message" m
    JOIN "ChatMember" cm ON cm."chatId" = m."chatId" AND cm."userId" = ${userId}
    JOIN "Chat" c ON c.id = m."chatId"
    LEFT JOIN "Group" g ON g.id = c."groupId"
    WHERE m."senderId" <> ${userId}
      AND m."deletedAt" IS NULL
      AND (cm."lastReadAt" IS NULL OR m."createdAt" > cm."lastReadAt")
      AND (g.id IS NULL OR g."isArchived" = false)
    GROUP BY m."chatId"`;
  return new Map(rows.map((r) => [r.chatId, r.unread]));
}

export async function unreadTotal(userId: string) {
  let total = 0;
  for (const count of (await unreadByChat(userId)).values()) total += count;
  return total;
}

export async function listChats(user: ChatUser): Promise<ChatSummaryDTO[]> {
  const [chats, unread] = await Promise.all([
    prisma.chat.findMany({
      where: { AND: [visibleChatsWhere(user), { members: { some: { userId: user.id } } }] },
      select: {
        id: true,
        type: true,
        createdAt: true,
        group: { select: { name: true } },
        members: { where: { userId: { not: user.id } }, take: 1, select: { user: { select: peerUserSelect } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: messageSelect },
      },
    }),
    unreadByChat(user.id),
  ]);

  return (
    chats
      // The teacher doesn't need a list of empty direct chats created for every student
      .filter((chat) => !(user.role === "ADMIN" && chat.type === "DIRECT" && chat.messages.length === 0))
      .map((chat) => {
        const last = chat.messages[0];
        return {
          id: chat.id,
          type: chat.type,
          groupName: chat.group?.name ?? null,
          peer: chat.type === "DIRECT" && chat.members[0] ? toPeer(chat.members[0].user) : null,
          lastMessage: last ? toMessageDTO(last, user.role === "ADMIN") : null,
          lastActivityAt: (last?.createdAt ?? chat.createdAt).toISOString(),
          unread: unread.get(chat.id) ?? 0,
        };
      })
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
  );
}

export async function loadMessagesPage(chatId: string, before: Date | undefined, revealDeleted: boolean) {
  const rows = await prisma.message.findMany({
    where: { chatId, ...(before && { createdAt: { lt: before } }) },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PAGE + 1,
    select: messageSelect,
  });
  return {
    messages: rows
      .slice(0, MESSAGES_PAGE)
      .reverse()
      .map((row) => toMessageDTO(row, revealDeleted)),
    hasMore: rows.length > MESSAGES_PAGE,
  };
}

export async function getThread(user: ChatUser, chatId: string): Promise<ChatThreadDTO | null> {
  const chat = await loadChatForUser(user, chatId);
  if (!chat) return null;

  const [page, peerMember, memberCount] = await Promise.all([
    loadMessagesPage(chat.id, undefined, user.role === "ADMIN"),
    chat.type === "DIRECT"
      ? prisma.chatMember.findFirst({ where: { chatId: chat.id, userId: { not: user.id } }, select: { user: { select: peerUserSelect } } })
      : null,
    chat.type === "GROUP" && chat.groupId ? prisma.groupMember.count({ where: { groupId: chat.groupId } }) : 2,
  ]);

  return {
    id: chat.id,
    type: chat.type,
    groupName: chat.group?.name ?? null,
    memberCount,
    peer: peerMember ? toPeer(peerMember.user) : null,
    ...page,
    readBy:
      chat.type === "DIRECT"
        ? Object.fromEntries(chat.members.filter((m) => m.userId !== user.id).map((m) => [m.userId, m.lastReadAt?.toISOString() ?? null]))
        : {},
  };
}

export async function listContacts(): Promise<ChatContact[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["STUDENT", "PARENT"] }, isActive: true },
    orderBy: [{ role: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: peerUserSelect,
  });
  return users.map((u) => {
    const peer = toPeer(u);
    return { id: peer.id, name: peer.name, role: u.role as "STUDENT" | "PARENT", details: peer.details };
  });
}
