"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/users";

export type LeadState = { status: "idle" | "ok" | "error"; error?: "name" | "phone" | "tooMany" | "generic" };

/** Sign-up request from the public page: stored for the teacher, who gets a notification. */
export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  // Bots fill every field; people never see this one
  if (formData.get("website")) return { status: "ok" };

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { status: "error", error: "name" };

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone || !/^\+998\d{9}$/.test(phone)) return { status: "error", error: "phone" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(`lead:${ip}`)) return { status: "error", error: "tooMany" };

  try {
    const lead = await prisma.lead.create({ data: { name, phone }, select: { id: true } });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    await notify(
      admins.map((a) => a.id),
      "lead.new",
      { leadId: lead.id, name, phone },
    );
    return { status: "ok" };
  } catch (error) {
    console.error("[lead]", error);
    return { status: "error", error: "generic" };
  }
}
