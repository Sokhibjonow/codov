import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { prisma } from "@/lib/db";
import { getOpenLessonIds, pick, studentCourseWhere } from "@/lib/learning";
import { setStudentAccess } from "../actions";

const byOrder = [{ order: "asc" as const }, { createdAt: "asc" as const }];

/** The student's lessons and tasks: which are open now, and which the teacher opened for this student. */
export async function LessonAccess({ t, locale, studentId }: { t: Dictionary; locale: Locale; studentId: string }) {
  const [courses, open, lessonAccess, assignmentAccess] = await Promise.all([
    prisma.course.findMany({
      where: studentCourseWhere(studentId),
      orderBy: byOrder,
      select: {
        id: true,
        titleUz: true,
        titleRu: true,
        modules: {
          orderBy: byOrder,
          select: {
            lessons: {
              where: { isPublished: true },
              orderBy: byOrder,
              select: {
                id: true,
                titleUz: true,
                titleRu: true,
                assignments: { where: { isPublished: true }, orderBy: byOrder, select: { id: true, titleUz: true, titleRu: true } },
              },
            },
          },
        },
      },
    }),
    getOpenLessonIds(studentId),
    prisma.studentLessonAccess.findMany({ where: { userId: studentId }, select: { lessonId: true } }),
    prisma.studentAssignmentAccess.findMany({ where: { userId: studentId }, select: { assignmentId: true } }),
  ]);
  const openedLessons = new Set(lessonAccess.map((a) => a.lessonId));
  const openedTasks = new Set(assignmentAccess.map((a) => a.assignmentId));

  return (
    <section className="card mt-4">
      <h2 className="text-lg font-extrabold">{t.students.lessonAccess}</h2>
      <p className="mb-4 mt-1 text-xs text-muted">{t.students.lessonAccessHint}</p>
      {courses.length === 0 ? (
        <p className="text-sm text-muted">{t.students.noCourses}</p>
      ) : (
        <ActionForm action={setStudentAccess.bind(null, studentId)} submitLabel={t.common.save}>
          {courses.map((course) => (
            <div key={course.id}>
              <h3 className="mb-2 font-extrabold">{pick(locale, course.titleUz, course.titleRu)}</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {course.modules
                  .flatMap((m) => m.lessons)
                  .map((lesson) => (
                    <li key={lesson.id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-0 flex-1 font-bold">
                          {pick(locale, lesson.titleUz, lesson.titleRu)}
                        </span>
                        <Badge tone={open.has(lesson.id) ? "success" : "neutral"}>
                          {open.has(lesson.id) ? t.students.lessonOpen : t.students.lessonLocked}
                        </Badge>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="lessonIds"
                            value={lesson.id}
                            defaultChecked={openedLessons.has(lesson.id)}
                            className="size-4 accent-primary"
                          />
                          {t.students.openForStudent}
                        </label>
                      </div>
                      {lesson.assignments.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-4">
                          {lesson.assignments.map((a) => (
                            <label key={a.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                              <input
                                type="checkbox"
                                name="assignmentIds"
                                value={a.id}
                                defaultChecked={openedTasks.has(a.id)}
                                className="size-3.5 accent-primary"
                              />
                              {pick(locale, a.titleUz, a.titleRu)}
                            </label>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </ActionForm>
      )}
    </section>
  );
}
