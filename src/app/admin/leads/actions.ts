"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
