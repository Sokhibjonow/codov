import { Archive, ArchiveRestore, CalendarCheck, Trash2, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/admin/BackLink";
import { FormDialog } from "@/components/admin/FormDialog";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPhone, fullName } from "@/lib/users";
import { addGroupMembers, deleteGroup, removeGroupMember, setGroupArchived, updateGroup } from "../actions";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { t } = await getDictionary();

  const group = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isArchived: true,
      members: {
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
        select: { user: { select: { id: true, firstName: true, lastName: true, login: true, phone: true, isActive: true } } },
      },
    },
  });
  if (!group) notFound();

  const candidates = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, groupMemberships: { none: { groupId: id } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, login: true },
  });

  return (
    <>
      <BackLink href="/admin/groups" label={t.groups.title} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
            {group.name}
            {group.isArchived && <Badge tone="accent">{t.groups.archived}</Badge>}
          </h1>
          <p className="mt-1 text-muted">{format(t.groups.studentsCount, { count: group.members.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link href={`/admin/groups/${group.id}/attendance`} className="btn border border-border bg-surface">
          <CalendarCheck size={18} />
          {t.attendance.title}
        </Link>
        <FormDialog
          t={t}
          title={t.groups.addMembers}
          trigger={
            <>
              <UserPlus size={18} />
              {t.groups.addMembers}
            </>
          }
          action={addGroupMembers.bind(null, group.id)}
          submitLabel={t.common.add}
        >
          <CheckboxList
            name="userIds"
            options={candidates.map((s) => ({ value: s.id, label: fullName(s), hint: s.login }))}
            emptyText={t.groups.allInGroup}
            searchPlaceholder={t.common.search}
          />
        </FormDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <section className="card p-0 lg:col-span-2">
          <h2 className="border-b border-border px-5 py-4 text-lg font-extrabold">{t.groups.members}</h2>
          {group.members.length === 0 ? (
            <p className="px-5 py-10 text-center text-muted">{t.groups.noMembers}</p>
          ) : (
            <ul className="divide-y divide-border">
              {group.members.map(({ user }) => (
                <li key={user.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={fullName(user)} size={34} />
                  <Link href={`/admin/students/${user.id}`} className="min-w-0 flex-1 hover:text-primary">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold">{fullName(user)}</span>
                      {!user.isActive && <Badge tone="danger">{t.common.inactive}</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      <span className="font-mono">{user.login}</span>
                      {user.phone && ` · ${formatPhone(user.phone)}`}
                    </span>
                  </Link>
                  <form action={removeGroupMember.bind(null, group.id, user.id)}>
                    <SubmitButton className="btn btn-ghost p-2" title={t.groups.remove} aria-label={t.groups.remove}>
                      <UserMinus size={17} />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-4 text-lg font-extrabold">{t.groups.settings}</h2>
            <ActionForm action={updateGroup.bind(null, group.id)} submitLabel={t.common.save}>
              <Field name="name" label={t.fields.groupName} defaultValue={group.name} maxLength={80} required />
              <TextArea name="description" label={t.fields.description} defaultValue={group.description ?? ""} maxLength={500} />
            </ActionForm>
          </section>

          <section className="card space-y-4">
            <form action={setGroupArchived.bind(null, group.id, !group.isArchived)}>
              <SubmitButton className="btn w-full border border-border bg-surface">
                {group.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                {group.isArchived ? t.groups.unarchive : t.groups.archive}
              </SubmitButton>
            </form>

            <div className="rounded-xl border border-danger/30 p-4">
              <h3 className="text-sm font-extrabold text-danger">{t.common.dangerZone}</h3>
              <p className="mb-3 mt-1 text-xs text-muted">{t.groups.deleteHint}</p>
              <form action={deleteGroup.bind(null, group.id)}>
                <SubmitButton className="btn bg-danger text-white hover:bg-danger/90" confirmText={t.common.confirmDelete}>
                  <Trash2 size={18} />
                  {t.common.delete}
                </SubmitButton>
              </form>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
