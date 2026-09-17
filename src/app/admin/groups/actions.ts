"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { fail, formList, formText, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function groupFields(formData: FormData) {
  return {
    name: formText(formData, "name").slice(0, 80),
    description: formText(formData, "description").slice(0, 500) || null,
  };
}

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const data = groupFields(formData);
  if (!data.name) return fail(t.common.errors.required);

  const group = await prisma.group.create({ data });
  revalidatePath("/admin", "layout");
  redirect(`/admin/groups/${group.id}`);
}

export async function updateGroup(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const data = groupFields(formData);
  if (!data.name) return fail(t.common.errors.required);

  const { count } = await prisma.group.updateMany({ where: { id: groupId }, data });
  if (count === 0) return fail(t.common.errors.notFound);

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.common.saved };
}

export async function setGroupArchived(groupId: string, isArchived: boolean) {
  await requireUser("ADMIN");
  await prisma.group.updateMany({ where: { id: groupId }, data: { isArchived } });
  revalidatePath("/admin", "layout");
}

export async function deleteGroup(groupId: string) {
  await requireUser("ADMIN");
  await prisma.group.deleteMany({ where: { id: groupId } });
  revalidatePath("/admin", "layout");
  redirect("/admin/groups");
}

export async function addGroupMembers(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) return fail(t.common.errors.notFound);

  const ids = formList(formData, "userIds");
  const students = await prisma.user.findMany({ where: { id: { in: ids }, role: "STUDENT" }, select: { id: true } });
  await prisma.groupMember.createMany({
    data: students.map((s) => ({ groupId, userId: s.id })),
    skipDuplicates: true,
  });

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.groups.membersAdded };
}

export async function removeGroupMember(groupId: string, userId: string) {
  await requireUser("ADMIN");
  await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  revalidatePath("/admin", "layout");
}
