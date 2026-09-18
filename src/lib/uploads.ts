import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Uploaded files. Locally and on a VPS they live on disk outside /public (so access can be checked);
// on Vercel, where the disk is read-only, they go to Vercel Blob (enabled by BLOB_READ_WRITE_TOKEN).
// Either way the site links to them as /files/<pathname>.
export const UPLOAD_ROOT = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.UPLOAD_DIR || "storage/uploads",
);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

type FileType = {
  contentType: string;
  /** Leading bytes the file must start with; null = not checked */
  signatures: number[][] | null;
  /** Shown in the browser instead of downloaded */
  inline: boolean;
  image?: boolean;
};

const ZIP = [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]];
const OFFICE = "application/vnd.openxmlformats-officedocument";

const FILE_TYPES: Record<string, FileType> = {
  png: { contentType: "image/png", signatures: [[0x89, 0x50, 0x4e, 0x47]], inline: true, image: true },
  jpg: { contentType: "image/jpeg", signatures: [[0xff, 0xd8, 0xff]], inline: true, image: true },
  gif: { contentType: "image/gif", signatures: [[0x47, 0x49, 0x46, 0x38]], inline: true, image: true },
  webp: { contentType: "image/webp", signatures: [[0x52, 0x49, 0x46, 0x46]], inline: true, image: true },
  pdf: { contentType: "application/pdf", signatures: [[0x25, 0x50, 0x44, 0x46]], inline: true },
  zip: { contentType: "application/zip", signatures: ZIP, inline: false },
  rar: { contentType: "application/vnd.rar", signatures: [[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]], inline: false },
  "7z": { contentType: "application/x-7z-compressed", signatures: [[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]], inline: false },
  psd: { contentType: "image/vnd.adobe.photoshop", signatures: [[0x38, 0x42, 0x50, 0x53]], inline: false },
  fig: { contentType: "application/octet-stream", signatures: null, inline: false },
  docx: { contentType: `${OFFICE}.wordprocessingml.document`, signatures: ZIP, inline: false },
  xlsx: { contentType: `${OFFICE}.spreadsheetml.sheet`, signatures: ZIP, inline: false },
  pptx: { contentType: `${OFFICE}.presentationml.presentation`, signatures: ZIP, inline: false },
  txt: { contentType: "text/plain; charset=utf-8", signatures: null, inline: false },
};

export const ATTACHMENT_EXTENSIONS = Object.keys(FILE_TYPES);
export const IMAGE_EXTENSIONS = Object.entries(FILE_TYPES)
  .filter(([, type]) => type.image)
  .map(([ext]) => ext);

function extensionOf(fileName: string) {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function matchesSignature(bytes: Uint8Array, type: FileType, ext: string) {
  if (!type.signatures) return true;
  const ok = type.signatures.some((sig) => sig.every((b, i) => bytes[i] === b));
  // RIFF is shared by several formats: make sure it really is WEBP
  if (ok && ext === "webp") return String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return ok;
}

export type StoredFile = { url: string; fileName: string; size: number };

/**
 * Vercel Blob is used when the project has a store: either the classic read-write token or,
 * for newer stores, BLOB_STORE_ID with Vercel's built-in (OIDC) authentication.
 */
export function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Newer stores have no read-write token; browser uploads then go through presigned URLs. */
export function blobUsesPresignedUploads() {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

function blobStoreId() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const id = token ? (token.split("_")[3] ?? "") : (process.env.BLOB_STORE_ID ?? "");
  return id.startsWith("store_") ? id.slice("store_".length) : id;
}

/** Checks the name and size before anything is stored. */
export function checkUpload(fileName: string, size: number, imagesOnly: boolean) {
  const ext = extensionOf(fileName);
  const type = FILE_TYPES[ext];
  if (!type || (imagesOnly && !type.image)) return null;
  const maxBytes = imagesOnly ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES;
  if (size <= 0 || size > maxBytes) return null;
  return { ext, type, maxBytes };
}

function datedFolder(imagesOnly: boolean) {
  const now = new Date();
  return [imagesOnly ? "images" : "files", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];
}

/**
 * Blob pathname for a new upload: images|files/YYYY/MM/<uuid>/<name>.<ext>.
 * The original name is kept so downloads get a readable file name.
 */
export function newBlobPathname(fileName: string, imagesOnly: boolean) {
  const checked = checkUpload(fileName, 1, imagesOnly);
  if (!checked) return null;
  const base = fileName
    .replace(/\.[^.]*$/, "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return [...datedFolder(imagesOnly), randomUUID(), `${base || "file"}.${checked.ext}`].join("/");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BLOB_NAME = /^[\p{L}\p{N}_-]{1,80}\.[a-z0-9]{1,5}$/u;

/** Validates /files/… segments for Blob storage (both the disk layout and the named layout). */
function blobPathname(segments: string[]) {
  const [kind, year, month, ...rest] = segments;
  if ((kind !== "images" && kind !== "files") || !/^\d{4}$/.test(year ?? "") || !/^\d{2}$/.test(month ?? "")) return null;
  const valid =
    (rest.length === 1 && /^[\w-]+\.\w+$/.test(rest[0])) || (rest.length === 2 && UUID.test(rest[0]) && BLOB_NAME.test(rest[1]));
  return valid ? segments.join("/") : null;
}

export function blobPublicUrl(pathname: string) {
  return `https://${blobStoreId()}.public.blob.vercel-storage.com/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

/** Where /files/… points on Vercel Blob, or null for an invalid path. */
export function resolveBlobUpload(segments: string[]) {
  const pathname = blobPathname(segments);
  if (!pathname) return null;
  const type = FILE_TYPES[extensionOf(pathname)];
  return type ? { url: blobPublicUrl(pathname), inline: type.inline } : null;
}

/**
 * After the browser uploaded straight to Blob: checks the real size and the leading bytes,
 * removes the blob when they don't match.
 */
export async function verifyBlobUpload(pathname: string, fileName: string, imagesOnly: boolean): Promise<StoredFile | null> {
  const segments = pathname.split("/");
  const checked = blobPathname(segments) === pathname && segments.length === 5 ? checkUpload(pathname, 1, imagesOnly) : null;
  if (!checked) return null;

  const url = blobPublicUrl(pathname);
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
    const total = Number(response.headers.get("content-range")?.split("/")[1] ?? response.headers.get("content-length"));
    // Read only the first bytes even if the range header is ignored
    const reader = response.body?.getReader();
    const chunks: number[] = [];
    while (reader && chunks.length < 16) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(...value.slice(0, 16 - chunks.length));
    }
    await reader?.cancel().catch(() => {});
    const bytes = Uint8Array.from(chunks);
    if (response.ok && total > 0 && total <= checked.maxBytes && matchesSignature(bytes, checked.type, checked.ext)) {
      return { url: `/files/${pathname}`, fileName: fileName.slice(0, 200), size: total };
    }
  } catch {
    return null;
  }
  const { del } = await import("@vercel/blob");
  await del(url).catch(() => {});
  return null;
}

/** Deletes an uploaded file (disk or Blob); missing files are ignored. */
export async function removeUpload(url: string) {
  if (!url.startsWith("/files/")) return;
  const segments = url.slice("/files/".length).split("?")[0].split("/").map((s) => decodeURIComponent(s));
  if (blobStorageEnabled()) {
    const file = resolveBlobUpload(segments);
    if (file) {
      const { del } = await import("@vercel/blob");
      await del(file.url).catch(() => {});
    }
    return;
  }
  const file = resolveUpload(segments);
  if (file) await unlink(file.absolute).catch(() => {});
}

/**
 * Saves an uploaded file to disk if its extension is allowed and its content matches the type.
 * Returns null for anything else.
 */
export async function saveUpload(file: File, options: { imagesOnly: boolean }): Promise<StoredFile | null> {
  const checked = checkUpload(file.name, file.size, options.imagesOnly);
  if (!checked) return null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, checked.type, checked.ext)) return null;

  const segments = [...datedFolder(options.imagesOnly), `${randomUUID()}.${checked.ext}`];
  const absolute = path.join(UPLOAD_ROOT, ...segments);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);

  return { url: `/files/${segments.join("/")}`, fileName: file.name.slice(0, 200), size: file.size };
}

/** Maps URL segments to a file inside UPLOAD_ROOT, rejecting anything that could escape it. */
export function resolveUpload(segments: string[]) {
  if (segments.length === 0 || segments.some((s) => !/^[\w-]+(\.[\w]+)?$/.test(s))) return null;
  const absolute = path.join(UPLOAD_ROOT, ...segments);
  if (!absolute.startsWith(UPLOAD_ROOT + path.sep)) return null;

  const type = FILE_TYPES[path.extname(absolute).slice(1)];
  return type ? { absolute, contentType: type.contentType, inline: type.inline } : null;
}
