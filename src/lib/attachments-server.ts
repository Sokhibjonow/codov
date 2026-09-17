import type { AttachmentTarget } from "./attachments";
import { prisma } from "./db";
import { removeUpload } from "./uploads";

export const ATTACHMENT_TARGETS: AttachmentTarget[] = ["course", "lesson", "assignment"];

export async function attachmentTargetExists(target: AttachmentTarget, id: string) {
  const query = { where: { id }, select: { id: true } };
  switch (target) {
    case "course":
      return !!(await prisma.course.findUnique(query));
    case "lesson":
      return !!(await prisma.lesson.findUnique(query));
    case "assignment":
      return !!(await prisma.assignment.findUnique(query));
    default:
      return false;
  }
}

/** Removes an uploaded file (disk or Blob); missing files are ignored. */
export async function removeUploadedFile(url: string) {
  await removeUpload(url);
}
