import { notFound } from "next/navigation";
import { updateProfile } from "@/app/admin/users/actions";
import { AccessSection } from "@/components/admin/AccessSection";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/admin/BackLink";
import { UserFields } from "@/components/admin/UserFields";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/users";
import { setParentChildren } from "../actions";

export default async function ParentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const parent = await prisma.user.findFirst({
    where: { id, role: "PARENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      children: { select: { childId: true } },
    },
  });
  if (!parent) notFound();

  const linkedIds = parent.children.map((c) => c.childId);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", OR: [{ isActive: true }, { id: { in: linkedIds } }] },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      groupMemberships: { select: { group: { select: { name: true } } } },
    },
  });

  const name = fullName(parent);

  return (
    <>
      <BackLink href="/admin/parents" label={t.parents.title} />

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl">{name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono">{parent.login}</span>
            {!parent.isActive && <Badge tone="danger">{t.common.inactive}</Badge>}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-extrabold">{t.parents.profile}</h2>
          <ActionForm action={updateProfile.bind(null, parent.id)} submitLabel={t.common.save}>
            <UserFields t={t} user={parent} />
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-extrabold">{t.fields.children}</h2>
          <ActionForm action={setParentChildren.bind(null, parent.id)} submitLabel={t.common.save}>
            <CheckboxList
              name="childIds"
              options={students.map((s) => ({
                value: s.id,
                label: fullName(s),
                hint: s.groupMemberships.map((m) => m.group.name).join(", "),
              }))}
              defaultSelected={linkedIds}
              emptyText={t.parents.noStudents}
              searchPlaceholder={t.common.search}
            />
          </ActionForm>
        </section>

        <AccessSection
          t={t}
          locale={locale}
          user={parent}
          deactivateHint=""
          deleteHint={t.parents.deleteHint}
        />
      </div>
    </>
  );
}
