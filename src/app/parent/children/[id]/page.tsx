import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/BackLink";
import { Avatar } from "@/components/Avatar";
import { StudentReport } from "@/components/progress/StudentReport";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentReport } from "@/lib/progress";
import { fullName } from "@/lib/users";

export default async function ParentChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("PARENT");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  // Only the parent's own children
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId: id, child: { isActive: true, role: "STUDENT" } },
    select: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          groupMemberships: { where: { group: { isArchived: false } }, select: { group: { select: { name: true } } } },
        },
      },
    },
  });
  if (!link) notFound();

  const report = await getStudentReport(link.child.id);
  const name = fullName(link.child);

  return (
    <>
      <BackLink href="/parent" label={t.nav.dashboard} />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl">{name}</h1>
          <p className="text-sm text-muted">
            {t.progress.title} · {link.child.groupMemberships.map((m) => m.group.name).join(", ") || t.dashboard.noGroup}
          </p>
        </div>
        <Link href="/parent/chat" className="btn border border-border bg-surface">
          <MessageCircle size={18} />
          {t.progress.writeTeacher}
        </Link>
      </div>

      <StudentReport t={t} locale={locale} report={report} />
    </>
  );
}
