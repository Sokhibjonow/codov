import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";

export type UserListItem = {
  id: string;
  href: string;
  name: string;
  login: string;
  phone: string;
  isActive: boolean;
  tags: string[];
  note?: string;
};

export function UserList({ items, emptyText, t }: { items: UserListItem[]; emptyText: string; t: Dictionary }) {
  if (items.length === 0) {
    return <p className="card py-10 text-center text-muted">{emptyText}</p>;
  }

  return (
    <>
      <p className="mb-2 text-sm font-semibold text-muted">{format(t.common.total, { count: items.length })}</p>
      <ul className="card divide-y divide-border overflow-hidden p-0">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background">
              <Avatar name={item.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-bold">{item.name}</span>
                  {!item.isActive && <Badge tone="danger">{t.common.inactive}</Badge>}
                </div>
                <p className="truncate text-xs text-muted">
                  <span className="font-mono">{item.login}</span>
                  {item.phone && <> · {item.phone}</>}
                  {item.note && <> · {item.note}</>}
                </p>
                {item.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} tone="primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
