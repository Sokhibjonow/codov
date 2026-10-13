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
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/users";

export type RegisterState =
  | {
      error: "required" | "phone" | "password" | "exists" | "closed" | "tooMany";
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
 * Free trial sign-up: the person becomes a student of the newest trial group,
 * logs in with their phone number and lands on the first lessons right away.
 */
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const back = { firstName: raw.firstName, lastName: raw.lastName, phone: raw.phone };
  const parsed = schema.safeParse(raw);
  // The hidden "website" field is only ever filled by bots
  if (!parsed.success || formData.get("website")) return { error: "required", ...back };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || !/^\+998\d{9}$/.test(phone)) return { error: "phone", ...back };
  if (parsed.data.password.length < 6) return { error: "password", ...back };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(`register:${ip}`)) return { error: "tooMany", ...back };

  const group = await prisma.group.findFirst({
    where: { isTrial: true, isArchived: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!group) return { error: "closed", ...back };

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
  const lead = await prisma.lead.create({ data: { name, phone } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await notify(admins.map((a) => a.id), "lead.new", { leadId: lead.id, name, phone });

  await createSession({ userId: user.id, role: user.role, sv: user.sessionVersion, remember: true });
  redirect("/student");
}
