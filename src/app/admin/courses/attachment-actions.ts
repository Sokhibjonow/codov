"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@/i18n/server";
import { fail, formText, type ActionState } from "@/lib/action-state";
import { targetField, youtubeId, type AttachmentTarget } from "@/lib/attachments";
import { ATTACHMENT_TARGETS, attachmentTargetExists, removeUploadedFile } from "@/lib/attachments-server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function addLinkAttachment(
  target: AttachmentTarget,
  targetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  let url: URL;
  try {
    url = new URL(formText(formData, "url").slice(0, 2000));
  } catch {
    return fail(t.attachments.invalidUrl);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail(t.attachments.invalidUrl);

  if (!ATTACHMENT_TARGETS.includes(target) || !(await attachmentTargetExists(target, targetId))) {
    return fail(t.common.errors.notFound);
  }

  const title = formText(formData, "title").slice(0, 200) || (youtubeId(url.href) ? "YouTube" : url.hostname);
  const field = targetField(target);
  const last = await prisma.attachment.aggregate({ where: { [field]: targetId }, _max: { order: true } });
  await prisma.attachment.create({
    data: { [field]: targetId, kind: "LINK", title, url: url.href, order: (last._max.order ?? -1) + 1 },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAttachment(attachmentId: string) {
  await requireUser("ADMIN");
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId }, select: { kind: true, url: true } });
  if (!attachment) return;

  await prisma.attachment.delete({ where: { id: attachmentId } });
  if (attachment.kind === "FILE") await removeUploadedFile(attachment.url);
  revalidatePath("/", "layout");
}
