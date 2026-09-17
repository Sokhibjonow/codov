import { Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { FormDialog } from "@/components/admin/FormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Field, TextArea } from "@/components/ui/Field";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createGroup } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("ADMIN");
  const { t } = await getDictionary();
  const archived = (await searchParams).archived === "1";

  const groups = await prisma.group.findMany({
    where: { isArchived: archived },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, _count: { select: { members: true } } },
  });

  const tabs = [
    { href: "/admin/groups", label: t.groups.activeTab, active: !archived },
    { href: "/admin/groups?archived=1", label: t.groups.archiveTab, active: archived },
  ];

  return (
    <>
      <PageHeader
        title={t.groups.title}
        subtitle={t.groups.subtitle}
        actions={
          <FormDialog
            t={t}
            title={t.groups.create}
            trigger={
              <>
                <Plus size={18} />
                {t.groups.create}
              </>
            }
            action={createGroup}
            submitLabel={t.common.create}
          >
            <Field name="name" label={t.fields.groupName} placeholder="Frontend-1" maxLength={80} required />
            <TextArea name="description" label={t.fields.description} maxLength={500} />
          </FormDialog>
        }
      />

      <nav className="mb-4 inline-flex gap-1 rounded-xl bg-surface p-1 shadow-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold ${
              tab.active ? "bg-primary text-on-color" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className="card py-10 text-center text-muted">{archived ? t.groups.emptyArchive : t.groups.empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/admin/groups/${group.id}`}
              className="card flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <UsersRound size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold">{group.name}</h2>
                  <p className="text-sm font-semibold text-muted">
                    {format(t.groups.studentsCount, { count: group._count.members })}
                  </p>
                </div>
              </div>
              {group.description && <p className="line-clamp-2 text-sm text-muted">{group.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
