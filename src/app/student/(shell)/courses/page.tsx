import { ArrowRight, BookOpen, PartyPopper } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { PageHeader } from "@/components/PageHeader";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getStudentCourses, pick } from "@/lib/learning";

export default async function StudentCoursesPage() {
  const user = await requireUser("STUDENT");
  const { t, locale } = await getDictionary();
  const courses = await getStudentCourses(user.id);

  return (
    <>
      <PageHeader title={t.nav.courses} />

      {courses.length === 0 ? (
        <p className="card py-10 text-center text-muted">{t.learn.noCourses}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="card flex flex-col gap-4">
              <Link href={`/student/courses/${course.id}`} className="flex items-start gap-3 hover:text-primary">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <BookOpen size={22} />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-lg font-extrabold leading-snug">
                    {pick(locale, course.titleUz, course.titleRu)}
                  </span>
                  <span className="line-clamp-2 block text-sm text-muted">
                    {pick(locale, course.descriptionUz, course.descriptionRu)}
                  </span>
                </span>
              </Link>

              <div className="mt-auto space-y-3">
                <ProgressBar done={course.done} total={course.total} label={format(t.learn.progress, { done: course.done, total: course.total })} />
                {course.total === 0 ? (
                  <p className="text-sm text-muted">{t.learn.noLessonsYet}</p>
                ) : course.nextLesson ? (
                  <Link href={`/student/lessons/${course.nextLesson.id}`} className="btn btn-primary w-full">
                    {course.done === 0 ? t.learn.start : t.learn.continue}
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <p className="flex items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 font-bold text-success">
                    <PartyPopper size={18} />
                    {t.learn.courseCompleted}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
