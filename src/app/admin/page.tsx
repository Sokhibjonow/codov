import { BookOpen, ClipboardCheck, GraduationCap, HeartHandshake, UsersRound } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const user = await requireUser("ADMIN");
  const { t } = await getDictionary();

  const [students, parents, groups, courses, pending] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { role: "PARENT", isActive: true } }),
    prisma.group.count({ where: { isArchived: false } }),
    prisma.course.count(),
    prisma.submission.count({ where: { status: "NEEDS_REVIEW" } }),
  ]);

  const stats = [
    { href: "/admin/submissions", label: t.dashboard.pendingReview, value: pending, icon: ClipboardCheck, highlight: pending > 0 },
    { href: "/admin/students", label: t.nav.students, value: students, icon: GraduationCap },
    { href: "/admin/groups", label: t.nav.groups, value: groups, icon: UsersRound },
    { href: "/admin/parents", label: t.nav.parents, value: parents, icon: HeartHandshake },
    { href: "/admin/courses", label: t.nav.courses, value: courses, icon: BookOpen },
  ];

  return (
    <>
      <PageHeader title={format(t.dashboard.hello, { name: user.firstName })} subtitle={t.dashboard.adminSubtitle} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        {stats.map(({ href, label, value, icon: Icon, highlight }) => (
          <Link
            key={href}
            href={href}
            className={`card transition hover:-translate-y-0.5 hover:shadow-lg ${
              highlight ? "border-accent bg-accent/10" : ""
            }`}
          >
            <Icon size={22} className={highlight ? "text-accent" : "text-primary"} />
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            <p className="text-sm font-semibold text-muted">{label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
