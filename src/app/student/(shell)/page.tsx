import { ArrowRight, BookOpen, ClipboardList, MessageCircle, PartyPopper } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { PageHeader } from "@/components/PageHeader";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getStudentCourses, pick } from "@/lib/learning";

export default async function StudentDashboard() {
  const user = await requireUser("STUDENT");
  const { t, locale } = await getDictionary();
  const courses = await getStudentCourses(user.id);

  const current = courses.find((c) => c.nextLesson);
  const hasLessons = courses.some((c) => c.total > 0);

  const links = [
    { href: "/student/courses", label: t.nav.courses, icon: BookOpen },
    { href: "/student/assignments", label: t.nav.assignments, icon: ClipboardList },
    { href: "/student/chat", label: t.nav.chat, icon: MessageCircle },
  ];

  return (
    <>
      <PageHeader title={format(t.dashboard.hello, { name: user.firstName })} subtitle={t.dashboard.studentSubtitle} />

      {current?.nextLesson ? (
        <Link
          href={`/student/lessons/${current.nextLesson.id}`}
          className="card mb-4 flex flex-col gap-4 border-primary/30 bg-gradient-to-br from-primary-soft to-surface transition hover:shadow-lg sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{t.learn.continueLearning}</p>
            <div>
              <p className="text-sm font-semibold text-muted">{pick(locale, current.titleUz, current.titleRu)}</p>
              <p className="text-xl font-extrabold">{pick(locale, current.nextLesson.titleUz, current.nextLesson.titleRu)}</p>
            </div>
            <ProgressBar done={current.done} total={current.total} label={format(t.learn.progress, { done: current.done, total: current.total })} />
          </div>
          <span className="btn btn-primary shrink-0">
            {current.done === 0 ? t.learn.start : t.learn.continue}
            <ArrowRight size={18} />
          </span>
        </Link>
      ) : (
        hasLessons && (
          <p className="card mb-4 flex items-center gap-3 font-bold text-success">
            <PartyPopper size={22} />
            {t.learn.allDone}
          </p>
        )
      )}

      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={24} />
            </span>
            <span className="text-lg font-extrabold">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
