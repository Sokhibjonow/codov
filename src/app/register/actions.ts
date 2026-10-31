"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPreferredLocale } from "@/i18n/server";
import { isUniqueViolation } from "@/lib/action-state";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTrialCourses } from "@/lib/trial";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/users";

export type RegisterState =
  | {
      error: "required" | "course" | "phone" | "password" | "exists" | "closed" | "tooMany";
      courseId: string;
      firstName: string;
      lastName: string;
      phone: string;
    }
  | undefined;

const schema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().min(1).max(30),
  password: z.string().max(200),
});

/**
 * Free trial sign-up: the person picks a course and becomes a student of the newest trial group with it,
 * logs in with their phone number and lands on the first lessons right away.
 */
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const courseId = String(formData.get("courseId") ?? "");
  const back = { courseId, firstName: raw.firstName, lastName: raw.lastName, phone: raw.phone };
  const parsed = schema.safeParse(raw);
  // The hidden "website" field is only ever filled by bots
  if (!parsed.success || formData.get("website")) return { error: "required", ...back };
  if (!courseId) return { error: "course", ...back };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || !/^\+998\d{9}$/.test(phone)) return { error: "phone", ...back };
  if (parsed.data.password.length < 6) return { error: "password", ...back };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(`register:${ip}`)) return { error: "tooMany", ...back };

  const trial = (await getTrialCourses()).find((c) => c.id === courseId);
  if (!trial) return { error: "closed", ...back };
  const group = { id: trial.groupId };

  const login = phone.slice(1);
  const name = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ");
  const passwordHash = await hashPassword(parsed.data.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        role: "STUDENT",
        login,
        passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        locale: await getPreferredLocale(),
        selfRegistered: true,
        lastLoginAt: new Date(),
        groupMemberships: { create: { groupId: group.id } },
      },
      select: { id: true, role: true, sessionVersion: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "exists", ...back };
    throw error;
  }

  // The teacher sees the sign-up among the requests and gets a notification to call back
  // The chosen course goes with the name, so the teacher knows what to talk about when calling back
  const leadName = `${name} · ${trial.titleUz}`;
  const lead = await prisma.lead.create({ data: { name: leadName, phone } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await notify(admins.map((a) => a.id), "lead.new", { leadId: lead.id, name: leadName, phone });

  await createSession({ userId: user.id, role: user.role, sv: user.sessionVersion, remember: true });
  redirect("/student");
}
