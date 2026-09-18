import { Check, Inbox, Phone, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { deleteLead, setLeadContacted } from "./actions";

/** Sign-up requests from the public page, newest and unanswered first. */
export default async function LeadsPage() {
  await requireUser("ADMIN");
  const { t, locale } = await getDictionary();

  const leads = await prisma.lead.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500 });
  const newCount = leads.filter((lead) => lead.status === "NEW").length;

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
    </>
  );
}
