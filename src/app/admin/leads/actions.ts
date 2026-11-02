"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/i18n/server";
import { fail, type ActionState } from "@/lib/action-state";
import { connectBot, telegramConfigured } from "@/lib/telegram";

export async function setLeadContacted(id: string, contacted: boolean) {
  await requireUser("ADMIN");
  await prisma.lead.update({
    where: { id },
    data: { status: contacted ? "CONTACTED" : "NEW", contactedAt: contacted ? new Date() : null },
  });
  revalidatePath("/admin/leads");
}

export async function deleteLead(id: string) {
  await requireUser("ADMIN");
  await prisma.lead.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/leads");
}

/** One click after the token is in the environment: webhook, commands and the bot's description. */
export async function connectTelegramBot(): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();
  if (!telegramConfigured()) return fail(t.leads.botNoToken);
  const ok = await connectBot();
  revalidatePath("/admin/leads");
  return ok ? { ok: true, message: t.leads.botConnectedNow } : fail(t.leads.botConnectFailed);
}
