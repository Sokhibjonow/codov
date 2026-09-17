import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { targetField, type AttachmentTarget } from "@/lib/attachments";
import { ATTACHMENT_TARGETS, attachmentTargetExists } from "@/lib/attachments-server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { blobStorageEnabled, checkUpload, newBlobPathname, saveUpload, verifyBlobUpload, type StoredFile } from "@/lib/uploads";

/**
 * Teacher uploads.
 * purpose=image      → an image for Markdown text, returns its URL
 * purpose=attachment → any allowed material, also creates an Attachment on the course/lesson/assignment
 *
 * Two ways to upload:
 * - multipart form with the file (disk storage: local computer, VPS);
 * - JSON {step:"start"} → the browser uploads straight to Vercel Blob → JSON {step:"complete"}
 *   (Vercel functions accept at most 4.5 MB, attachments are up to 50 MB).
 */

type Purpose = "image" | "attachment";
type Target = { target?: unknown; targetId?: unknown };

const bad = (status: number, error: string) => NextResponse.json({ error }, { status });

async function validTarget(purpose: Purpose, { target, targetId }: Target) {
  if (purpose === "image") return true;
  return (
    ATTACHMENT_TARGETS.includes(target as AttachmentTarget) &&
    typeof targetId === "string" &&
    (await attachmentTargetExists(target as AttachmentTarget, targetId))
  );
}

async function finish(stored: StoredFile, purpose: Purpose, { target, targetId }: Target) {
  if (purpose === "attachment") {
    const field = targetField(target as AttachmentTarget);
    const last = await prisma.attachment.aggregate({ where: { [field]: targetId }, _max: { order: true } });
    await prisma.attachment.create({
      data: {
        [field]: targetId,
        kind: "FILE",
        title: stored.fileName.replace(/\.[^.]+$/, "").slice(0, 200) || stored.fileName,
        url: stored.url,
        fileName: stored.fileName,
        size: stored.size,
        order: (last._max.order ?? -1) + 1,
      },
    });
    revalidatePath("/", "layout");
  }
  return NextResponse.json({ url: stored.url });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return bad(403, "forbidden");

  if (request.headers.get("content-type")?.startsWith("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | ({ step?: unknown; purpose?: unknown; fileName?: unknown; size?: unknown; pathname?: unknown } & Target)
      | null;
    const purpose = body?.purpose;
    if (!body || (purpose !== "image" && purpose !== "attachment") || typeof body.fileName !== "string") return bad(400, "bad request");
    if (!(await validTarget(purpose, body))) return bad(404, "not found");

    if (body.step === "start") {
      if (!blobStorageEnabled()) return NextResponse.json({ mode: "form" });
      const size = Number(body.size);
      const pathname = checkUpload(body.fileName, size, purpose === "image") && newBlobPathname(body.fileName, purpose === "image");
      if (!pathname) return bad(415, "unsupported file");
      return NextResponse.json({ mode: "blob", pathname });
    }

    if (body.step === "complete" && blobStorageEnabled() && typeof body.pathname === "string") {
      const stored = await verifyBlobUpload(body.pathname, body.fileName, purpose === "image");
      if (!stored) return bad(415, "unsupported file");
      return finish(stored, purpose, body);
    }
    return bad(400, "bad request");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return bad(400, "bad request");
  }

  const file = formData.get("file");
  const purpose = formData.get("purpose");
  if (!(file instanceof File) || (purpose !== "image" && purpose !== "attachment")) return bad(400, "bad request");

  const target = { target: formData.get("target"), targetId: formData.get("targetId") };
  if (!(await validTarget(purpose, target))) return bad(404, "not found");

  const stored = await saveUpload(file, { imagesOnly: purpose === "image" });
  if (!stored) return bad(415, "unsupported file");
  return finish(stored, purpose, target);
}
