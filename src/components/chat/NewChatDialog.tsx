"use client";

import { Loader2, MessageSquarePlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { openDirectChat } from "@/lib/chat/actions";
import type { ChatContact } from "@/lib/chat/types";

/** Teacher starts a direct chat with a student or a parent. */
export function NewChatDialog({ t, contacts, basePath }: { t: Dictionary; contacts: ChatContact[]; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = contacts.filter((c) => !q || `${c.name} ${c.details.join(" ")}`.toLowerCase().includes(q));

  const start = async (contactId: string) => {
    setOpening(contactId);
    const chatId = await openDirectChat(contactId);
    setOpening(null);
    if (!chatId) return;
    setOpen(false);
    router.push(`${basePath}?c=${chatId}`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary shrink-0 p-2.5" title={t.chat.newChat} aria-label={t.chat.newChat}>
        <MessageSquarePlus size={18} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t.chat.newChat} closeLabel={t.common.close}>
        <div className="space-y-3">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.chat.newChatSearch}
              className="input pl-9"
            />
          </label>
          <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t.common.nothingFound}</li>}
            {visible.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => start(contact.id)}
                  disabled={opening !== null}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-background"
                >
                  <Avatar name={contact.name} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{contact.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {t.roles[contact.role]}
                      {contact.details.length > 0 && ` · ${contact.details.join(", ")}`}
                    </span>
                  </span>
                  {opening === contact.id && <Loader2 size={16} className="animate-spin text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
