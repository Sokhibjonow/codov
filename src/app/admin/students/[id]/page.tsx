import { Link2, Unlink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unlinkParentChild, updateProfile } from "@/app/admin/users/actions";
import { AccessSection } from "@/components/admin/AccessSection";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/admin/BackLink";
import { FormDialog } from "@/components/admin/FormDialog";
import { UserFields } from "@/components/admin/UserFields";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StudentReport } from "@/components/progress/StudentReport";
import { getDictionary } from "@/i18n/server";
import { getStudentReport } from "@/lib/progress";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone, fullName } from "@/lib/users";
import { linkParent, setStudentGroups } from "../actions";
import { LinkParentFields } from "../LinkParentFields";
import { LessonAccess } from "./LessonAccess";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      groupMemberships: { select: { groupId: true } },
      parents: { select: { parent: { select: { id: true, firstName: true, lastName: true, login: true, phone: true } } } },
    },
  });
  if (!student) notFound();

  const [groups, otherParents] = await Promise.all([
    prisma.group.findMany({
      where: { OR: [{ isArchived: false }, { members: { some: { userId: id } } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isArchived: true },
    }),
    prisma.user.findMany({
      where: { role: "PARENT", children: { none: { childId: id } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, phone: true },
    }),
  ]);

  const name = fullName(student);

  return (
    <>
      <BackLink href="/admin/students" label={t.students.title} />

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl">{name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono">{student.login}</span>
            {!student.isActive && <Badge tone="danger">{t.common.inactive}</Badge>}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-extrabold">{t.students.profile}</h2>
          <ActionForm action={updateProfile.bind(null, student.id)} submitLabel={t.common.save}>
            <UserFields t={t} user={student} />
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-extrabold">{t.fields.groups}</h2>
          <ActionForm action={setStudentGroups.bind(null, student.id)} submitLabel={t.common.save}>
            <CheckboxList
              name="groupIds"
              options={groups.map((g) => ({ value: g.id, label: g.name, hint: g.isArchived ? t.groups.archived : undefined }))}
              defaultSelected={student.groupMemberships.map((m) => m.groupId)}
              emptyText={t.groups.empty}
              searchPlaceholder={t.common.search}
            />
          </ActionForm>
        </section>

        <section className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">{t.fields.parents}</h2>
            <FormDialog
              t={t}
              title={t.students.linkParent}
              trigger={
                <>
                  <Link2 size={18} />
                  {t.students.linkParent}
                </>
              }
              triggerClassName="btn border border-border bg-surface text-sm"
              action={linkParent.bind(null, student.id)}
              submitLabel={t.students.linkParent}
            >
              <LinkParentFields
                t={t}
                parents={otherParents.map((p) => ({ id: p.id, name: fullName(p), phone: formatPhone(p.phone) }))}
              />
            </FormDialog>
          </div>

          {student.parents.length === 0 ? (
            <p className="text-sm text-muted">{t.students.noParents}</p>
          ) : (
            <ul className="divide-y divide-border">
              {student.parents.map(({ parent }) => (
                <li key={parent.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={fullName(parent)} size={32} />
                  <Link href={`/admin/parents/${parent.id}`} className="min-w-0 flex-1 hover:text-primary">
                    <span className="block truncate font-bold">{fullName(parent)}</span>
                    <span className="block truncate text-xs text-muted">
                      <span className="font-mono">{parent.login}</span>
                      {parent.phone && ` · ${formatPhone(parent.phone)}`}
                    </span>
                  </Link>
                  <form action={unlinkParentChild.bind(null, parent.id, student.id)}>
                    <SubmitButton className="btn btn-ghost p-2" title={t.students.unlink} aria-label={t.students.unlink}>
                      <Unlink size={16} />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AccessSection
          t={t}
          locale={locale}
          user={student}
          deactivateHint={t.students.deactivateHint}
          deleteHint={t.students.deleteHint}
        />
      </div>

      <LessonAccess t={t} locale={locale} studentId={student.id} />

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">{t.progress.title}</h2>
        <StudentReport t={t} locale={locale} report={await getStudentReport(student.id)} />
      </section>
    </>
  );
}
