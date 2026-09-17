"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/client";
import { getDictionary } from "@/i18n/server";
import { fail, formText, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDateString, toDbDate } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { fullName } from "@/lib/users";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

/** Saves the attendance of one group for one day; students left unmarked get their record removed. */
export async function saveAttendance(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const day = formText(formData, "date");
  if (!isDateString(day)) return fail(t.common.errors.required);

  const members = await prisma.groupMember.findMany({
    where: { groupId, user: { role: "STUDENT" } },
    select: { userId: true },
  });
  if (members.length === 0) return fail(t.common.errors.notFound);

  const date = toDbDate(day);
  const previous = await prisma.attendanceRecord.findMany({ where: { groupId, date }, select: { studentId: true, status: true } });
  const wasAbsent = new Set(previous.filter((r) => r.status === "ABSENT").map((r) => r.studentId));
  const newlyAbsent: string[] = [];

  const writes = members.map(({ userId: studentId }) => {
    const status = formText(formData, `status_${studentId}`) as AttendanceStatus;
    const note = formText(formData, `note_${studentId}`).slice(0, 300) || null;
    if (status === "ABSENT" && !wasAbsent.has(studentId)) newlyAbsent.push(studentId);
    return STATUSES.includes(status)
      ? prisma.attendanceRecord.upsert({
          where: { groupId_studentId_date: { groupId, studentId, date } },
          create: { groupId, studentId, date, status, note },
          update: { status, note },
        })
      : prisma.attendanceRecord.deleteMany({ where: { groupId, studentId, date } });
  });
  await prisma.$transaction(writes);

  // Parents hear about a missed class once, not on every re-save
  if (newlyAbsent.length > 0) {
    const [group, children] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      prisma.user.findMany({
        where: { id: { in: newlyAbsent } },
        select: { id: true, firstName: true, lastName: true, parents: { select: { parentId: true } } },
      }),
    ]);
    for (const child of children) {
      await notify(
        child.parents.map((p) => p.parentId),
        "attendance.absent",
        { childId: child.id, childName: fullName(child), date: day, groupName: group?.name ?? "" },
      );
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, message: t.common.saved };
}
