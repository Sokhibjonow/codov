"use server";

import { getCurrentUser } from "./auth";
import { prisma } from "./db";
import { ensureDeadlineReminders, type NotificationItem } from "./notifications";

const LIST_SIZE = 30;

export async function getNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const user = await getCurrentUser();
  if (!user) return { items: [], unread: 0 };
  if (user.role === "STUDENT") await ensureDeadlineReminders(user.id);

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: LIST_SIZE,
      select: { id: true, type: true, data: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      data: row.data,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })) as NotificationItem[],
    unread,
  };
}

/** Marks the given notifications (or all of them) as read. */
export async function markNotificationsRead(ids?: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids && { id: { in: ids.slice(0, 100) } }) },
    data: { readAt: new Date() },
  });
}
