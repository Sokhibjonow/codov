import type { Prisma } from "@/generated/prisma/client";
import { publish } from "./chat/bus";
import { prisma } from "./db";
import { studentAssignmentWhere } from "./learning";

// In-app notifications (the bell). Texts are built on the client from `type` + `data`,
// so they follow the viewer's language.

export type NotificationData = {
  "submission.new": { submissionId: string; assignmentId: string; studentName: string; titleUz: string; titleRu: string };
  "submission.reviewed": {
    submissionId: string;
    assignmentId: string;
    status: "ACCEPTED" | "RETURNED";
    score: number | null;
    maxScore: number;
    titleUz: string;
    titleRu: string;
    /** Set for parents */
    childId?: string;
    childName?: string;
  };
  "assignment.new": { assignmentId: string; titleUz: string; titleRu: string };
  "deadline.soon": { assignmentId: string; titleUz: string; titleRu: string; dueAt: string };
  "attendance.absent": { childId: string; childName: string; date: string; groupName: string };
};

export type NotificationType = keyof NotificationData;

export type NotificationItem = {
  [K in NotificationType]: { id: string; type: K; data: NotificationData[K]; read: boolean; createdAt: string };
}[NotificationType];

export async function notify<K extends NotificationType>(userIds: string[], type: K, data: NotificationData[K]) {
  const recipients = [...new Set(userIds)];
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({ userId, type, data: data as unknown as Prisma.InputJsonValue })),
  });
  publish(recipients, { type: "notification" });
}

/** Tells the students who can see a newly published assignment (once per assignment). */
export async function notifyAssignmentPublished(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      isPublished: true,
      lesson: { select: { isPublished: true, module: { select: { course: { select: { isPublished: true, groups: { select: { groupId: true } } } } } } } },
    },
  });
  const course = assignment?.lesson.module.course;
  if (!assignment?.isPublished || !assignment.lesson.isPublished || !course?.isPublished) return;

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      groupMemberships: { some: { groupId: { in: course.groups.map((g) => g.groupId) } } },
    },
    select: { id: true },
  });
  const already = await prisma.notification.findMany({
    where: { type: "assignment.new", userId: { in: students.map((s) => s.id) }, data: { path: ["assignmentId"], equals: assignmentId } },
    select: { userId: true },
  });
  const notified = new Set(already.map((n) => n.userId));

  await notify(
    students.map((s) => s.id).filter((id) => !notified.has(id)),
    "assignment.new",
    { assignmentId, titleUz: assignment.titleUz, titleRu: assignment.titleRu },
  );
}

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Creates "deadline in less than 24 hours" reminders for a student. Called when the student's
 * pages load, so no background scheduler is needed.
 */
export async function ensureDeadlineReminders(studentId: string) {
  const now = new Date();
  const soon = await prisma.assignment.findMany({
    where: {
      ...studentAssignmentWhere(studentId),
      deadlines: { some: { dueAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) }, group: { members: { some: { userId: studentId } } } } },
      submissions: { none: { studentId, status: { in: ["SUBMITTED", "NEEDS_REVIEW", "ACCEPTED"] } } },
    },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      deadlines: {
        where: { group: { members: { some: { userId: studentId } } } },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
    },
  });
  if (soon.length === 0) return;

  const existing = await prisma.notification.findMany({
    where: { userId: studentId, type: "deadline.soon", createdAt: { gt: new Date(now.getTime() - 3 * REMINDER_WINDOW_MS) } },
    select: { data: true },
  });
  const reminded = new Set(existing.map((n) => (n.data as { assignmentId?: string }).assignmentId));

  for (const assignment of soon) {
    if (reminded.has(assignment.id) || !assignment.deadlines[0]) continue;
    await notify([studentId], "deadline.soon", {
      assignmentId: assignment.id,
      titleUz: assignment.titleUz,
      titleRu: assignment.titleRu,
      dueAt: assignment.deadlines[0].dueAt.toISOString(),
    });
  }
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
