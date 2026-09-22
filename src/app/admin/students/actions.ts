"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@/i18n/server";
import {
  fail,
  formList,
  formText,
  isUniqueViolation,
  type ActionState,
  type Credential,
} from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/password";
import { fullName, LOGIN_PATTERN, loginBase, normalizePhone, pickUniqueLogin } from "@/lib/users";

function parentFields(formData: FormData) {
  return {
    firstName: formText(formData, "parentFirstName").slice(0, 60),
    lastName: formText(formData, "parentLastName").slice(0, 60),
    phone: formText(formData, "parentPhone").slice(0, 30),
  };
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const firstName = formText(formData, "firstName").slice(0, 60);
  const lastName = formText(formData, "lastName").slice(0, 60);
  const phone = formText(formData, "phone").slice(0, 30);
  const requestedLogin = formText(formData, "login").toLowerCase();
  const groupIds = formList(formData, "groupIds");
  const parent = parentFields(formData);

  if (!firstName) return fail(t.common.errors.required);
  if (requestedLogin && !LOGIN_PATTERN.test(requestedLogin)) return fail(t.common.errors.loginFormat);

  const reserved = new Set<string>(requestedLogin ? [requestedLogin] : []);
  const login = requestedLogin || (await pickUniqueLogin(loginBase(firstName, lastName), reserved));
  const password = generatePassword();
  const parentPassword = parent.firstName ? generatePassword() : null;
  const [passwordHash, parentHash] = await Promise.all([
    hashPassword(password),
    parentPassword ? hashPassword(parentPassword) : null,
  ]);

  const credentials: Credential[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      const student = await tx.user.create({
        data: {
          role: "STUDENT",
          login,
          passwordHash,
          firstName,
          lastName,
          phone: normalizePhone(phone),
          groupMemberships: { create: groupIds.map((groupId) => ({ groupId })) },
        },
      });
      credentials.push({ name: fullName(student), role: "STUDENT", login, password });

      if (parentPassword && parentHash) {
        const parentLogin = await pickUniqueLogin(loginBase(parent.firstName, parent.lastName), reserved, tx);
        const created = await tx.user.create({
          data: {
            role: "PARENT",
            login: parentLogin,
            passwordHash: parentHash,
            firstName: parent.firstName,
            lastName: parent.lastName,
            phone: normalizePhone(parent.phone),
            children: { create: { childId: student.id } },
          },
        });
        credentials.push({ name: fullName(created), role: "PARENT", login: parentLogin, password: parentPassword });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(t.common.errors.loginTaken);
    throw error;
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.students.created, credentials };
}

export async function setStudentGroups(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true } });
  if (!student) return fail(t.common.errors.notFound);

  const groupIds = formList(formData, "groupIds");
  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { userId: studentId, groupId: { notIn: groupIds } } }),
    prisma.groupMember.createMany({
      data: groupIds.map((groupId) => ({ groupId, userId: studentId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.common.saved };
}

/** Lessons and single tasks the teacher opens for this student ahead of the usual order. */
export async function setStudentAccess(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true } });
  if (!student) return fail(t.common.errors.notFound);

  const [lessons, assignments] = await Promise.all([
    prisma.lesson.findMany({ where: { id: { in: formList(formData, "lessonIds") } }, select: { id: true } }),
    prisma.assignment.findMany({ where: { id: { in: formList(formData, "assignmentIds") } }, select: { id: true } }),
  ]);
  const lessonIds = lessons.map((l) => l.id);
  const assignmentIds = assignments.map((a) => a.id);
  await prisma.$transaction([
    prisma.studentLessonAccess.deleteMany({ where: { userId: studentId, lessonId: { notIn: lessonIds } } }),
    prisma.studentLessonAccess.createMany({ data: lessonIds.map((lessonId) => ({ userId: studentId, lessonId })), skipDuplicates: true }),
    prisma.studentAssignmentAccess.deleteMany({ where: { userId: studentId, assignmentId: { notIn: assignmentIds } } }),
    prisma.studentAssignmentAccess.createMany({ data: assignmentIds.map((assignmentId) => ({ userId: studentId, assignmentId })), skipDuplicates: true }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true, message: t.common.saved };
}

export async function linkParent(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true } });
  if (!student) return fail(t.common.errors.notFound);

  if (formText(formData, "mode") === "existing") {
    const parentId = formText(formData, "parentId");
    const parent = await prisma.user.findFirst({ where: { id: parentId, role: "PARENT" }, select: { id: true } });
    if (!parent) return fail(t.common.errors.required);

    await prisma.parentChild.createMany({ data: [{ parentId, childId: studentId }], skipDuplicates: true });
    revalidatePath("/admin", "layout");
    return { ok: true, message: t.students.parentLinked };
  }

  const parent = parentFields(formData);
  if (!parent.firstName) return fail(t.common.errors.required);

  const password = generatePassword();
  const login = await pickUniqueLogin(loginBase(parent.firstName, parent.lastName));
  try {
    const created = await prisma.user.create({
      data: {
        role: "PARENT",
        login,
        passwordHash: await hashPassword(password),
        firstName: parent.firstName,
        lastName: parent.lastName,
        phone: normalizePhone(parent.phone),
        children: { create: { childId: studentId } },
      },
    });

    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: t.students.parentLinked,
      credentials: [{ name: fullName(created), role: "PARENT", login, password }],
    };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(t.common.errors.loginTaken);
    throw error;
  }
}
