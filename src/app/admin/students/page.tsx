import { FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { FormDialog } from "@/components/admin/FormDialog";
import { SearchFilters } from "@/components/admin/SearchFilters";
import { UserFields } from "@/components/admin/UserFields";
import { UserList } from "@/components/admin/UserList";
import { PageHeader } from "@/components/PageHeader";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { Field } from "@/components/ui/Field";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone, fullName, userSearchWhere } from "@/lib/users";
import { createStudent } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const param = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim() : "");

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("ADMIN");
  const { t } = await getDictionary();
  const sp = await searchParams;
  const q = param(sp.q);
  const group = param(sp.group);
  const status = param(sp.status) || "active";

  const where: Prisma.UserWhereInput = { role: "STUDENT", ...(q && userSearchWhere(q)) };
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (group === "none") where.groupMemberships = { none: {} };
  else if (group) where.groupMemberships = { some: { groupId: group } };

  const [students, groups] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        phone: true,
        isActive: true,
        groupMemberships: { select: { group: { select: { name: true } } } },
      },
    }),
    prisma.group.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <>
      <PageHeader
        title={t.students.title}
        subtitle={t.students.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/students/import" className="btn border border-border bg-surface">
              <FileSpreadsheet size={18} />
              {t.students.import}
            </Link>
            <FormDialog
              t={t}
              title={t.students.create}
              trigger={
                <>
                  <Plus size={18} />
                  {t.students.create}
                </>
              }
              action={createStudent}
              submitLabel={t.common.create}
              wide
            >
              <UserFields t={t} loginOptional />
              <div>
                <span className="mb-1.5 block text-sm font-bold">{t.fields.groups}</span>
                <CheckboxList name="groupIds" options={groupOptions} emptyText={t.groups.empty} searchPlaceholder={t.common.search} />
              </div>
              <fieldset className="rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-bold">
                  {t.students.parentSection} <span className="font-normal text-muted">({t.common.optional})</span>
                </legend>
                <p className="mb-3 text-xs text-muted">{t.students.parentSectionHint}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="parentLastName" label={t.fields.lastName} maxLength={60} />
                  <Field name="parentFirstName" label={t.fields.firstName} maxLength={60} />
                  <Field
                    name="parentPhone"
                    type="tel"
                    inputMode="tel"
                    label={t.fields.phone}
                    placeholder="+998 90 123 45 67"
                    maxLength={30}
                    className="sm:col-span-2"
                  />
                </div>
              </fieldset>
            </FormDialog>
          </div>
        }
      />

      <SearchFilters
        t={t}
        q={q}
        selects={[
          {
            name: "group",
            value: group,
            options: [{ value: "", label: t.students.allGroups }, ...groupOptions, { value: "none", label: t.students.noGroup }],
          },
          {
            name: "status",
            value: status,
            options: [
              { value: "active", label: t.students.statusActive },
              { value: "inactive", label: t.students.statusInactive },
              { value: "all", label: t.students.statusAll },
            ],
          },
        ]}
      />

      <UserList
        t={t}
        emptyText={q || group ? t.common.nothingFound : t.students.empty}
        items={students.map((s) => ({
          id: s.id,
          href: `/admin/students/${s.id}`,
          name: fullName(s),
          login: s.login,
          phone: formatPhone(s.phone),
          isActive: s.isActive,
          tags: s.groupMemberships.map((m) => m.group.name),
        }))}
      />
    </>
  );
}
