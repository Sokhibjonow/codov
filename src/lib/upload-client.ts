import type { AttachmentTarget } from "./attachments";

export type UploadResult = { ok: true; url: string } | { ok: false };

type UploadOptions =
  | { purpose: "image" }
  | { purpose: "attachment"; target: AttachmentTarget; targetId: string };

type Progress = ((percent: number) => void) | undefined;

async function postJson(body: Record<string, unknown>) {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok ? ((await response.json()) as Record<string, string>) : null;
}

/**
 * Uploads a file with progress. On disk storage the file goes to /api/uploads;
 * on Vercel the browser sends it straight to Vercel Blob and the server checks it afterwards.
 */
export async function uploadFile(file: File, options: UploadOptions, onProgress?: (percent: number) => void): Promise<UploadResult> {
  const meta = { ...options, fileName: file.name, size: file.size };
  const start = await postJson({ ...meta, step: "start" }).catch(() => null);
  if (!start) return { ok: false };
  if (start.mode === "blob") return uploadToBlob(file, start.pathname, Boolean(start.presigned), meta, onProgress);
  return uploadForm(file, options, onProgress);
}

async function uploadToBlob(
  file: File,
  pathname: string,
  presigned: boolean,
  meta: Record<string, unknown>,
  onProgress: Progress,
): Promise<UploadResult> {
  let settled = false;
  let percent = 0;
  let uploading: Promise<unknown>;
  try {
    const { upload, uploadPresigned } = await import("@vercel/blob/client");
    // Newer stores (no read-write token) use presigned URLs; large files go in parts on classic stores
    uploading = (presigned ? uploadPresigned : upload)(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/blob",
      multipart: !presigned && file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => {
        percent = percentage;
        onProgress?.(Math.round(percentage));
      },
    }).then(
      () => (settled = true),
      (error) => {
        settled = true;
        console.warn("[upload]", error);
      },
    );
  } catch (error) {
    console.warn("[upload]", error);
    return { ok: false };
  }

  // The presigned upload can store the file and still never settle in the browser, so we don't rely
  // on it: once the file is (nearly) sent, the server is asked every few seconds whether the stored
  // file is there and valid. Checks run one at a time so the attachment is created only once.
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await Promise.race([uploading, new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (!settled && percent < 90 && file.size > 1024 * 1024) continue;
    const done = await postJson({ ...meta, step: "complete", pathname }).catch(() => null);
    if (done?.url) {
      onProgress?.(100);
      return { ok: true, url: done.url };
    }
    if (settled) return { ok: false };
  }
  return { ok: false };
}

/** fetch can't report upload progress, so this one uses XMLHttpRequest. */
function uploadForm(file: File, options: UploadOptions, onProgress: Progress) {
  return new Promise<UploadResult>((resolve) => {
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", options.purpose);
    if (options.purpose === "attachment") {
      body.append("target", options.target);
      body.append("targetId", options.targetId);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string };
        resolve(xhr.status === 200 && data.url ? { ok: true, url: data.url } : { ok: false });
      } catch {
        resolve({ ok: false });
      }
    };
    xhr.onerror = () => resolve({ ok: false });
    xhr.send(body);
  });
}
