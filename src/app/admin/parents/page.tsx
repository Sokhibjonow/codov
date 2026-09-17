import { Plus } from "lucide-react";
import { FormDialog } from "@/components/admin/FormDialog";
import { SearchFilters } from "@/components/admin/SearchFilters";
import { UserFields } from "@/components/admin/UserFields";
import { UserList } from "@/components/admin/UserList";
import { PageHeader } from "@/components/PageHeader";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone, fullName, userSearchWhere } from "@/lib/users";
import { createParent } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ParentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("ADMIN");
  const { t } = await getDictionary();
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim() : "";

  const [parents, students] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PARENT", ...(q && userSearchWhere(q)) },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        phone: true,
        isActive: true,
        children: { select: { child: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        groupMemberships: { select: { group: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={t.parents.title}
        subtitle={t.parents.subtitle}
        actions={
          <FormDialog
            t={t}
            title={t.parents.create}
            trigger={
              <>
                <Plus size={18} />
                {t.parents.create}
              </>
            }
            action={createParent}
            submitLabel={t.common.create}
            wide
          >
            <UserFields t={t} loginOptional />
            <div>
              <span className="mb-1.5 block text-sm font-bold">{t.parents.selectChildren}</span>
              <CheckboxList
                name="childIds"
                options={students.map((s) => ({
                  value: s.id,
                  label: fullName(s),
                  hint: s.groupMemberships.map((m) => m.group.name).join(", "),
                }))}
                emptyText={t.parents.noStudents}
                searchPlaceholder={t.common.search}
              />
            </div>
          </FormDialog>
        }
      />

      <SearchFilters t={t} q={q} />

      <UserList
        t={t}
        emptyText={q ? t.common.nothingFound : t.parents.empty}
        items={parents.map((p) => ({
          id: p.id,
          href: `/admin/parents/${p.id}`,
          name: fullName(p),
          login: p.login,
          phone: formatPhone(p.phone),
          isActive: p.isActive,
          tags: p.children.map((c) => fullName(c.child)),
          note: p.children.length === 0 ? t.parents.noChildren : undefined,
        }))}
      />
    </>
  );
}
