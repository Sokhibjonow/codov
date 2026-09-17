import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, ClipboardList, Languages, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/BackLink";
import { AttachmentsList } from "@/components/attachments/AttachmentsList";
import { AssignmentStatusBadge } from "@/components/learn/AssignmentStatusBadge";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { Markdown } from "@/components/markdown/Markdown";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignmentProgress, getStudentCourses, pick, studentCourseWhere } from "@/lib/learning";
import { setLessonCompleted } from "../actions";

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("STUDENT");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const lesson = await prisma.lesson.findFirst({
    where: { id, isPublished: true, module: { course: studentCourseWhere(user.id) } },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      contentUz: true,
      contentRu: true,
      module: { select: { titleUz: true, titleRu: true, courseId: true } },
      attachments: { orderBy: attachmentOrder, select: attachmentSelect },
      assignments: {
        where: { isPublished: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          drafts: { where: { userId: user.id }, select: { updatedAt: true } },
          submissions: { where: { studentId: user.id }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        },
      },
    },
  });
  if (!lesson) notFound();

  const [course] = await getStudentCourses(user.id, lesson.module.courseId);
  if (!course) notFound();

  const index = course.lessons.findIndex((l) => l.id === lesson.id);
  const prev = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  const done = course.completed.has(lesson.id);

  const ownText = locale === "uz" ? lesson.contentUz : lesson.contentRu;
  const content = pick(locale, lesson.contentUz, lesson.contentRu);
  // The language whose text is actually shown (pick falls back when a translation is empty)
  const contentLang = content === lesson.contentUz ? "uz" : "ru";

  return (
    <article className="mx-auto max-w-3xl">
      <BackLink href={`/student/courses/${course.id}`} label={pick(locale, course.titleUz, course.titleRu)} />

      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
          {format(t.learn.lesson, { n: index + 1 })} · {pick(locale, lesson.module.titleUz, lesson.module.titleRu)}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{pick(locale, lesson.titleUz, lesson.titleRu)}</h1>
      </header>

      {!ownText.trim() && content.trim() && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm font-semibold text-primary">
          <Languages size={18} className="shrink-0" />
          {t.lessons.translationMissing}
        </p>
      )}

      <div className="card md:p-8">
        {content.trim() ? (
          <Markdown
            content={content}
            resultLabel={t.lessons.result}
            resultUrl={(i) => `/results/lesson/${lesson.id}/${contentLang}/${i}`}
          />
        ) : (
          <p className="text-muted">{t.learn.noLessonsYet}</p>
        )}
      </div>

      <AttachmentsList items={lesson.attachments} t={t} className="mt-6" />

      {lesson.assignments.length > 0 && (
        <section className="card mt-6 p-0">
          <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-extrabold">
            <ClipboardList size={20} className="text-primary" />
            {t.assignments.lessonAssignments}
          </h2>
          <ul className="divide-y divide-border">
            {lesson.assignments.map((assignment) => (
              <li key={assignment.id}>
                <Link href={`/student/assignments/${assignment.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                  <span className="min-w-0 flex-1 truncate font-bold">{pick(locale, assignment.titleUz, assignment.titleRu)}</span>
                  <AssignmentStatusBadge status={assignmentProgress(assignment)} t={t} />
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {done ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 font-bold text-success">
              <CheckCircle2 size={20} />
              {t.learn.lessonDone}
            </span>
            <form action={setLessonCompleted.bind(null, lesson.id, false)}>
              <SubmitButton className="btn btn-ghost text-sm">
                <RotateCcw size={16} />
                {t.learn.undo}
              </SubmitButton>
            </form>
          </div>
        ) : (
          <form action={setLessonCompleted.bind(null, lesson.id, true)}>
            <SubmitButton className="btn bg-success px-6 py-3 text-on-color hover:bg-success/90">
              <CheckCircle2 size={20} />
              {t.learn.markDone}
            </SubmitButton>
          </form>
        )}
      </div>

      <nav className="mt-6 grid grid-cols-2 gap-3">
        {prev ? (
          <Link href={`/student/lessons/${prev.id}`} className="card flex items-center gap-2 p-4 hover:border-primary">
            <ArrowLeft size={18} className="shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="block text-xs text-muted">{t.learn.prev}</span>
              <span className="block truncate font-bold">{pick(locale, prev.titleUz, prev.titleRu)}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/student/lessons/${next.id}`} className="card flex items-center justify-end gap-2 p-4 text-right hover:border-primary">
            <span className="min-w-0">
              <span className="block text-xs text-muted">{t.learn.next}</span>
              <span className="block truncate font-bold">{pick(locale, next.titleUz, next.titleRu)}</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-muted" />
          </Link>
        )}
      </nav>
    </article>
  );
}
