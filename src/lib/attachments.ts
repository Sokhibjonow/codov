export type AttachmentTarget = "course" | "lesson" | "assignment";

// Must match the allow-list in lib/uploads.ts
export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.zip,.rar,.7z,.psd,.fig,.docx,.xlsx,.pptx,.txt";

export const attachmentSelect = {
  id: true,
  kind: true,
  title: true,
  url: true,
  fileName: true,
  size: true,
} as const;

export type AttachmentItem = {
  id: string;
  kind: "FILE" | "LINK";
  title: string;
  url: string;
  fileName: string | null;
  size: number | null;
};

export const attachmentOrder = [{ order: "asc" as const }, { createdAt: "asc" as const }];

export function targetField(target: AttachmentTarget) {
  return ({ course: "courseId", lesson: "lessonId", assignment: "assignmentId" } as const)[target];
}

/** Returns the 11-character video id for youtube.com / youtu.be links, otherwise null. */
export function youtubeId(url: string) {
  const match =
    /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?![\w-])/.exec(
      url.trim(),
    );
  return match?.[1] ?? null;
}

/** Start time from ?t=90 / ?t=1m30s / &start=90, in seconds */
export function youtubeStart(url: string) {
  const match = /[?&](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(\d+)s?(?:&|$)/.exec(url);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export function youtubeEmbedUrl(url: string) {
  const id = youtubeId(url);
  if (!id) return null;
  const start = youtubeStart(url);
  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
}

export function fileExtension(fileName: string | null) {
  return fileName?.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageFile(fileName: string | null) {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(fileExtension(fileName));
}

/** Download URL that makes the server send the original file name */
export function downloadUrl(item: { url: string; fileName: string | null }) {
  return item.fileName ? `${item.url}?name=${encodeURIComponent(item.fileName)}` : item.url;
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
