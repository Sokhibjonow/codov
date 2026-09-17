"use client";

import { Link2, Paperclip, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormDialog } from "@/components/admin/FormDialog";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { FormAction } from "@/lib/action-state";
import {
  ATTACHMENT_ACCEPT,
  downloadUrl,
  fileExtension,
  formatBytes,
  hostname,
  type AttachmentItem,
  type AttachmentTarget,
} from "@/lib/attachments";
import { uploadFile } from "@/lib/upload-client";
import { AttachmentIcon } from "./AttachmentIcon";

type UploadRow = { key: number; name: string; percent: number; failed: boolean };

type AttachmentsManagerProps = {
  t: Dictionary;
  target: AttachmentTarget;
  targetId: string;
  items: AttachmentItem[];
  addLink: FormAction;
  deleteAttachment: (id: string) => Promise<void>;
};

export function AttachmentsManager({ t, target, targetId, items, addLink, deleteAttachment }: AttachmentsManagerProps) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const nextKey = useRef(0);

  const updateRow = (key: number, patch: Partial<UploadRow>) =>
    setUploads((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const uploadAll = async (files: File[]) => {
    for (const file of files) {
      const key = nextKey.current++;
      setUploads((rows) => [...rows, { key, name: file.name, percent: 0, failed: false }]);

      const result = await uploadFile(file, { purpose: "attachment", target, targetId }, (percent) => updateRow(key, { percent }));
      if (result.ok) {
        setUploads((rows) => rows.filter((row) => row.key !== key));
        router.refresh();
      } else {
        updateRow(key, { failed: true });
      }
    }
  };

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Paperclip size={20} className="text-primary" />
          {t.attachments.title}
        </h2>
        <p className="mt-1 text-xs text-muted">{t.attachments.adminHint}</p>
      </div>

      {items.length === 0 && uploads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted">{t.attachments.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 pl-3 pr-1.5">
              <AttachmentIcon item={item} />
              <a
                href={item.kind === "FILE" ? downloadUrl(item) : item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 hover:text-primary"
              >
                <span className="block truncate text-sm font-bold">{item.title}</span>
                <span className="block truncate text-xs text-muted">
                  {item.kind === "FILE"
                    ? `${fileExtension(item.fileName).toUpperCase()} · ${formatBytes(item.size)}`
                    : hostname(item.url)}
                </span>
              </a>
              <form action={deleteAttachment.bind(null, item.id)}>
                <SubmitButton
                  className="btn btn-ghost p-2 hover:text-danger"
                  confirmText={t.attachments.deleteConfirm}
                  title={t.common.delete}
                  aria-label={t.common.delete}
                >
                  <Trash2 size={16} />
                </SubmitButton>
              </form>
            </li>
          ))}

          {uploads.map((row) => (
            <li key={row.key} className="px-3 py-2.5">
              {row.failed ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <span className="min-w-0 flex-1">
                    {format(t.attachments.uploadFailed, { name: row.name })}
                    <span className="block text-xs font-normal text-muted">{t.attachments.allowed}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost p-1.5"
                    aria-label={t.common.close}
                    onClick={() => setUploads((rows) => rows.filter((r) => r.key !== row.key))}
                  >
                    <X size={16} />
                  </button>
                </p>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold">{format(t.attachments.uploading, { name: row.name, percent: row.percent })}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${row.percent}%` }} />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="btn btn-primary cursor-pointer text-sm">
          <Upload size={16} />
          {t.attachments.upload}
          <input
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void uploadAll(files);
            }}
          />
        </label>
        <FormDialog
          t={t}
          title={t.attachments.addLink}
          trigger={
            <>
              <Link2 size={16} />
              {t.attachments.addLink}
            </>
          }
          triggerClassName="btn border border-border bg-surface text-sm"
          action={addLink}
          submitLabel={t.common.add}
        >
          <Field name="url" type="url" label={t.attachments.linkUrl} placeholder="https://www.youtube.com/watch?v=…" required />
          <Field name="title" label={t.attachments.linkTitle} hint={t.attachments.linkTitleHint} maxLength={200} />
        </FormDialog>
      </div>
      <p className="text-xs text-muted">{t.attachments.allowed}</p>
    </section>
  );
}
