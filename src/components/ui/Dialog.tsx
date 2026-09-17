"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  wide?: boolean;
  children: ReactNode;
};

export function Dialog({ open, onClose, title, closeLabel, wide, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-1.5rem)] rounded-2xl bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 ${
        wide ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="btn btn-ghost p-1.5">
          <X size={20} />
        </button>
      </div>
      {/* Content mounts only while open, so forms start fresh every time */}
      <div className="max-h-[75vh] overflow-y-auto p-5">{open && children}</div>
    </dialog>
  );
}
