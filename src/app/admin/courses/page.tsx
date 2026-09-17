import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { BilingualFields } from "@/components/admin/BilingualFields";
import { FormDialog } from "@/components/admin/FormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/learning";
import { createCourse } from "./actions";

export default async function CoursesPage() {
  await requireUser("ADMIN");
  const { t, locale } = await getDictionary();

  const courses = await prisma.course.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      isPublished: true,
      _count: { select: { modules: true, groups: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title={t.courses.title}
        subtitle={t.courses.subtitle}
        actions={
          <FormDialog
            t={t}
            title={t.courses.create}
            trigger={
              <>
                <Plus size={18} />
                {t.courses.create}
              </>
            }
            action={createCourse}
            submitLabel={t.common.create}
            wide
          >
            <BilingualFields t={t} withDescription />
          </FormDialog>
        }
      />

      {courses.length === 0 ? (
        <p className="card py-10 text-center text-muted">{t.courses.empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {courses.map((course) => {
            const lessons = course.modules.reduce((sum, m) => sum + m._count.lessons, 0);
            return (
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}`}
                className="card flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <BookOpen size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-lg font-extrabold leading-snug">
                      {pick(locale, course.titleUz, course.titleRu)}
                    </h2>
                    <div className="mt-1">
                      <Badge tone={course.isPublished ? "success" : "neutral"}>
                        {course.isPublished ? t.courses.published : t.courses.draft}
                      </Badge>
                    </div>
                  </div>
                </div>
                {pick(locale, course.descriptionUz, course.descriptionRu) && (
                  <p className="line-clamp-2 text-sm text-muted">{pick(locale, course.descriptionUz, course.descriptionRu)}</p>
                )}
                <p className="mt-auto flex flex-wrap gap-x-3 text-xs font-semibold text-muted">
                  <span>{format(t.courses.modulesCount, { count: course._count.modules })}</span>
                  <span>{format(t.courses.lessonsCount, { count: lessons })}</span>
                  <span>{format(t.courses.groupsCount, { count: course._count.groups })}</span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
