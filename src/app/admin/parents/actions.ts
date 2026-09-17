"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@/i18n/server";
import { fail, formList, formText, isUniqueViolation, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/password";
import { fullName, LOGIN_PATTERN, loginBase, normalizePhone, pickUniqueLogin } from "@/lib/users";

async function onlyStudentIds(ids: string[]) {
  if (ids.length === 0) return [];
  const students = await prisma.user.findMany({ where: { id: { in: ids }, role: "STUDENT" }, select: { id: true } });
  return students.map((s) => s.id);
}

export async function createParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const firstName = formText(formData, "firstName").slice(0, 60);
  const lastName = formText(formData, "lastName").slice(0, 60);
  const phone = formText(formData, "phone").slice(0, 30);
  const requestedLogin = formText(formData, "login").toLowerCase();

  if (!firstName) return fail(t.common.errors.required);
  if (requestedLogin && !LOGIN_PATTERN.test(requestedLogin)) return fail(t.common.errors.loginFormat);

  const childIds = await onlyStudentIds(formList(formData, "childIds"));
  const login = requestedLogin || (await pickUniqueLogin(loginBase(firstName, lastName)));
  const password = generatePassword();

  try {
    const parent = await prisma.user.create({
      data: {
        role: "PARENT",
        login,
        passwordHash: await hashPassword(password),
        firstName,
        lastName,
        phone: normalizePhone(phone),
        children: { create: childIds.map((childId) => ({ childId })) },
      },
    });

    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: t.parents.created,
      credentials: [{ name: fullName(parent), role: "PARENT", login, password }],
    };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(t.common.errors.loginTaken);
    throw error;
  }
}

export async function setParentChildren(parentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const parent = await prisma.user.findFirst({ where: { id: parentId, role: "PARENT" }, select: { id: true } });
  if (!parent) return fail(t.common.errors.notFound);

  const childIds = await onlyStudentIds(formList(formData, "childIds"));
  await prisma.$transaction([
    prisma.parentChild.deleteMany({ where: { parentId, childId: { notIn: childIds } } }),
    prisma.parentChild.createMany({
      data: childIds.map((childId) => ({ parentId, childId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.common.saved };
}
