import { Download, ExternalLink, Maximize2, Paperclip } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import {
  downloadUrl,
  fileExtension,
  formatBytes,
  hostname,
  isImageFile,
  youtubeEmbedUrl,
  type AttachmentItem,
} from "@/lib/attachments";
import { AttachmentIcon } from "./AttachmentIcon";

/** Materials as students see them: embedded videos, mockup previews, downloads and links. */
export function AttachmentsList({ items, t, className = "" }: { items: AttachmentItem[]; t: Dictionary; className?: string }) {
  if (items.length === 0) return null;

  const videos = items.filter((i) => i.kind === "LINK" && youtubeEmbedUrl(i.url));
  const images = items.filter((i) => i.kind === "FILE" && isImageFile(i.fileName));
  const files = items.filter((i) => i.kind === "FILE" && !isImageFile(i.fileName));
  const links = items.filter((i) => i.kind === "LINK" && !youtubeEmbedUrl(i.url));

  const heading = (text: string) => <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">{text}</h3>;

  return (
    <section className={`card space-y-5 ${className}`}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <Paperclip size={20} className="text-primary" />
        {t.attachments.title}
      </h2>

      {videos.length > 0 && (
        <div className="space-y-4">
          {heading(t.attachments.video)}
          {videos.map((item) => (
            <div key={item.id}>
              <p className="mb-1.5 font-bold">{item.title}</p>
              <div className="video-embed">
                <iframe
                  src={youtubeEmbedUrl(item.url)!}
                  title={item.title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div>
          {heading(t.attachments.mockups)}
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener"
                title={t.attachments.openFull}
                className="group block overflow-hidden rounded-xl border border-border transition hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.title} loading="lazy" className="aspect-video w-full bg-background object-cover object-top" />
                <span className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm font-semibold">
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <Maximize2 size={16} className="shrink-0 text-muted group-hover:text-primary" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          {heading(t.attachments.files)}
          <ul className="space-y-2">
            {files.map((item) => {
              const ext = fileExtension(item.fileName);
              return (
                <li key={item.id}>
                  <a
                    href={downloadUrl(item)}
                    target={ext === "pdf" ? "_blank" : undefined}
                    rel="noopener"
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary"
                  >
                    <AttachmentIcon item={item} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{item.title}</span>
                      <span className="block text-xs text-muted">
                        {ext.toUpperCase()}
                        {item.size ? ` · ${formatBytes(item.size)}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
                      {ext === "pdf" ? <ExternalLink size={16} /> : <Download size={16} />}
                      <span className="hidden sm:inline">{ext === "pdf" ? t.attachments.open : t.attachments.download}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {links.length > 0 && (
        <div>
          {heading(t.attachments.links)}
          <ul className="space-y-2">
            {links.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary"
                >
                  <AttachmentIcon item={item} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{hostname(item.url)}</span>
                  </span>
                  <ExternalLink size={16} className="shrink-0 text-primary" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
