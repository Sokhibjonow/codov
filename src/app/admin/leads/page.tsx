import { Bot, Check, Inbox, Phone, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysAgo, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { deleteLead, setLeadContacted } from "./actions";

/** Sign-up requests from the public page, newest and unanswered first. */
export default async function LeadsPage() {
  await requireUser("ADMIN");
  const { t, locale } = await getDictionary();

  const leads = await prisma.lead.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500 });
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  const dayStart = daysAgo(1);
  const [botUsers, botTotal, botToday, bySource] = await Promise.all([
    prisma.botUser.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.botUser.count(),
    prisma.botUser.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.botUser.groupBy({ by: ["source"], _count: { _all: true }, orderBy: { _count: { source: "desc" } }, take: 12 }),
  ]);

  return (
    <>
      <PageHeader
        title={t.leads.title}
        subtitle={t.leads.subtitle}
        actions={newCount > 0 ? <Badge tone="primary">{format(t.leads.newCount, { count: newCount })}</Badge> : undefined}
      />

      {leads.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center text-muted">
          <Inbox size={32} />
          <p className="max-w-md">{t.leads.empty}</p>
        </div>
      ) : (
        <ul className="card divide-y divide-border p-0">
          {leads.map((lead) => {
            const isNew = lead.status === "NEW";
            return (
              <li key={lead.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${isNew ? "" : "opacity-70"}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {lead.name}
                    <Badge tone={isNew ? "primary" : "success"}>{isNew ? t.leads.statusNew : t.leads.statusContacted}</Badge>
                  </p>
                  <p className="text-sm text-muted">
                    <a href={`tel:${lead.phone}`} className="font-mono font-semibold text-foreground hover:text-primary">
                      {formatPhone(lead.phone)}
                    </a>
                    {" · "}
                    {formatDateTime(lead.createdAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a href={`tel:${lead.phone}`} className="btn btn-ghost p-2" title={t.leads.call} aria-label={t.leads.call}>
                    <Phone size={18} />
                  </a>
                  <form action={setLeadContacted.bind(null, lead.id, isNew)}>
                    <SubmitButton className={isNew ? "btn btn-primary px-3 py-2 text-sm" : "btn btn-ghost px-3 py-2 text-sm"}>
                      {isNew ? <Check size={16} /> : <RotateCcw size={16} />}
                      {isNew ? t.leads.markContacted : t.leads.markNew}
                    </SubmitButton>
                  </form>
                  <form action={deleteLead.bind(null, lead.id)}>
                    <SubmitButton
                      className="btn btn-ghost p-2 hover:text-danger"
                      confirmText={t.common.confirmDelete}
                      title={t.leads.delete}
                      aria-label={t.leads.delete}
                    >
                      <Trash2 size={18} />
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card mt-6 p-0">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <Bot size={22} className="text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold">{t.leads.botTitle}</h2>
            <p className="text-xs text-muted">{t.leads.botHint}</p>
          </div>
          <Badge tone="primary">{format(t.leads.botTotal, { count: botTotal })}</Badge>
          <Badge>{format(t.leads.botToday, { count: botToday })}</Badge>
        </header>
        {bySource.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
            {bySource.map((s) => (
              <span key={s.source} className="rounded-full bg-background px-3 py-1 text-sm font-bold">
                {s.source || "—"} · {s._count._all}
              </span>
            ))}
          </div>
        )}
        {botUsers.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted">{t.leads.botEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {botUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {u.firstName || "—"}{" "}
                    {u.username && (
                      <a href={`https://t.me/${u.username}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline">
                        @{u.username}
                      </a>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {t.leads.botSource}: {u.source || "—"} · {formatDateTime(u.createdAt, locale)}
                  </p>
                </div>
                <Badge tone={u.giftSent ? "success" : "neutral"}>{u.giftSent ? t.leads.botGift : t.leads.botNoGift}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
