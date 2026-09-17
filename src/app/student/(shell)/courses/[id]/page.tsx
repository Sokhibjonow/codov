import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/BackLink";
import { AttachmentsList } from "@/components/attachments/AttachmentsList";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentCourses, pick } from "@/lib/learning";

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const [course] = await getStudentCourses(user.id, id);
  if (!course) notFound();

  // Access was checked by getStudentCourses above
  const attachments = await prisma.attachment.findMany({
    where: { courseId: course.id },
    orderBy: attachmentOrder,
    select: attachmentSelect,
  });

  let lessonNumber = 0;
  const modules = course.modules
    .filter((m) => m.lessons.length > 0)
    .map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, number: ++lessonNumber })) }));

  return (
    <>
      <BackLink href="/student/courses" label={t.nav.courses} />

      <div className="card mb-4 space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{pick(locale, course.titleUz, course.titleRu)}</h1>
          <p className="mt-1 text-muted">{pick(locale, course.descriptionUz, course.descriptionRu)}</p>
        </div>
        <ProgressBar done={course.done} total={course.total} label={format(t.learn.progress, { done: course.done, total: course.total })} />
        {course.nextLesson && (
          <Link href={`/student/lessons/${course.nextLesson.id}`} className="btn btn-primary">
            {course.done === 0 ? t.learn.start : t.learn.continue}
            <ArrowRight size={18} />
          </Link>
        )}
      </div>

      <AttachmentsList items={attachments} t={t} className="mb-4" />

      {modules.length === 0 && <p className="card py-10 text-center text-muted">{t.learn.noLessonsYet}</p>}

      <div className="space-y-4">
        {modules.map((module, i) => (
          <section key={module.id} className="card overflow-hidden p-0">
            <header className="border-b border-border bg-background/60 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{format(t.courses.module, { n: i + 1 })}</p>
              <h2 className="font-extrabold">{pick(locale, module.titleUz, module.titleRu)}</h2>
            </header>
            <ol className="divide-y divide-border">
              {module.lessons.map((lesson) => {
                const done = course.completed.has(lesson.id);
                const isNext = course.nextLesson?.id === lesson.id;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/student/lessons/${lesson.id}`}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background ${isNext ? "bg-primary-soft/60" : ""}`}
                    >
                      {done ? (
                        <CheckCircle2 size={22} className="shrink-0 text-success" />
                      ) : (
                        <Circle size={22} className={`shrink-0 ${isNext ? "text-primary" : "text-border"}`} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-muted">{format(t.learn.lesson, { n: lesson.number })}</span>
                        <span className="block truncate font-bold">{pick(locale, lesson.titleUz, lesson.titleRu)}</span>
                      </span>
                      {isNext && <ArrowRight size={18} className="shrink-0 text-primary" />}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
