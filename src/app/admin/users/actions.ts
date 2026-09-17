"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDictionary } from "@/i18n/server";
import { fail, formText, isUniqueViolation, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/password";
import { fullName, LOGIN_PATTERN, normalizePhone } from "@/lib/users";

// Actions shared by the student and parent pages.

async function findManagedUser(userId: string) {
  await requireUser("ADMIN");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, firstName: true, lastName: true, login: true },
  });
  // The teacher account is managed with `npm run create-admin`, never from these forms
  return user && user.role !== "ADMIN" ? user : null;
}

const profileSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60),
  phone: z.string().max(30),
  login: z.string().toLowerCase(),
});

export async function updateProfile(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await findManagedUser(userId);
  const { t } = await getDictionary();
  if (!user) return fail(t.common.errors.notFound);

  const parsed = profileSchema.safeParse({
    firstName: formText(formData, "firstName"),
    lastName: formText(formData, "lastName"),
    phone: formText(formData, "phone"),
    login: formText(formData, "login"),
  });
  if (!parsed.success) return fail(t.common.errors.required);

  const { firstName, lastName, phone, login } = parsed.data;
  if (!LOGIN_PATTERN.test(login)) return fail(t.common.errors.loginFormat);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { firstName, lastName, phone: normalizePhone(phone), login },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(t.common.errors.loginTaken);
    throw error;
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.common.saved };
}

export async function resetPassword(userId: string): Promise<ActionState> {
  const user = await findManagedUser(userId);
  const { t } = await getDictionary();
  if (!user) return fail(t.common.errors.notFound);

  const password = generatePassword();
  // Bumping sessionVersion logs the user out on every device
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
  });

  return {
    ok: true,
    message: t.students.passwordReset,
    credentials: [{ name: fullName(user), role: user.role, login: user.login, password }],
  };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const user = await findManagedUser(userId);
  if (!user) return;

  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  revalidatePath("/admin", "layout");
}

export async function deleteUser(userId: string) {
  const user = await findManagedUser(userId);
  if (!user) return;

  await prisma.user.delete({ where: { id: user.id } });
  revalidatePath("/admin", "layout");
  redirect(user.role === "PARENT" ? "/admin/parents" : "/admin/students");
}

export async function unlinkParentChild(parentId: string, childId: string) {
  await requireUser("ADMIN");
  await prisma.parentChild.deleteMany({ where: { parentId, childId } });
  revalidatePath("/admin", "layout");
}
