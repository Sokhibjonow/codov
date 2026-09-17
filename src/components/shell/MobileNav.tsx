"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";

type MobileNavProps = {
  home: string;
  menuLabel: string;
  children: ReactNode;
  footer: ReactNode;
  actions?: ReactNode;
};

export function MobileNav({ home, menuLabel, children, footer, actions }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
        <Link href={home} onClick={() => setOpen(false)}>
          <Logo size={28} />
        </Link>
        <div className="flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={menuLabel}
            className="btn btn-ghost p-2"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-20 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="relative max-h-full overflow-y-auto border-b border-border bg-surface p-3 shadow-xl"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <nav>{children}</nav>
            <div className="mt-3 border-t border-border px-1 pt-3">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
