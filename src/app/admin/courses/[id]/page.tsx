import { ClipboardList, ClipboardPlus, Eye, EyeOff, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { createAssignment } from "../assignment-actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { AttachmentsManager } from "@/components/attachments/AttachmentsManager";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { addLinkAttachment, deleteAttachment } from "../attachment-actions";
import { BackLink } from "@/components/admin/BackLink";
import { BilingualFields } from "@/components/admin/BilingualFields";
import { FormDialog } from "@/components/admin/FormDialog";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { Badge } from "@/components/ui/Badge";
import { CheckboxList } from "@/components/ui/CheckboxList";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/learning";
import {
  createLesson,
  createModule,
  deleteCourse,
  deleteModule,
  moveLesson,
  moveModule,
  setCourseGroups,
  setCoursePublished,
  updateCourse,
  updateModule,
} from "../actions";

const byOrder = [{ order: "asc" as const }, { createdAt: "asc" as const }];

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const { t, locale } = await getDictionary();

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      isPublished: true,
      groups: { select: { groupId: true } },
      attachments: { orderBy: attachmentOrder, select: attachmentSelect },
      modules: {
        orderBy: byOrder,
        select: {
          id: true,
          titleUz: true,
          titleRu: true,
          lessons: {
            orderBy: byOrder,
            select: {
              id: true,
              titleUz: true,
              titleRu: true,
              isPublished: true,
              assignments: {
                orderBy: byOrder,
                select: { id: true, titleUz: true, titleRu: true, isPublished: true },
              },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const groups = await prisma.group.findMany({
    where: { OR: [{ isArchived: false }, { courses: { some: { courseId: id } } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isArchived: true },
  });

  // Lessons are numbered continuously through the whole course
  const firstLessonNumber = course.modules.map((_, i) =>
    course.modules.slice(0, i).reduce((sum, m) => sum + m.lessons.length, 1),
  );

  return (
    <>
      <BackLink href="/admin/courses" label={t.courses.title} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{pick(locale, course.titleUz, course.titleRu)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={course.isPublished ? "success" : "neutral"}>
              {course.isPublished ? t.courses.published : t.courses.draft}
            </Badge>
            {!course.isPublished && t.courses.draftHint}
          </p>
        </div>
        <form action={setCoursePublished.bind(null, course.id, !course.isPublished)}>
          <SubmitButton className={course.isPublished ? "btn border border-border bg-surface" : "btn btn-primary"}>
            {course.isPublished ? <EyeOff size={18} /> : <Eye size={18} />}
            {course.isPublished ? t.courses.unpublish : t.courses.publish}
          </SubmitButton>
        </form>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">{t.courses.structure}</h2>
            <FormDialog
              t={t}
              title={t.courses.addModule}
              trigger={
                <>
                  <FolderPlus size={18} />
                  {t.courses.addModule}
                </>
              }
              triggerClassName="btn border border-border bg-surface"
              action={createModule.bind(null, course.id)}
              submitLabel={t.common.add}
            >
              <BilingualFields t={t} />
            </FormDialog>
          </div>

          {course.modules.length === 0 && <p className="card py-10 text-center text-muted">{t.courses.noModules}</p>}

          {course.modules.map((module, moduleIndex) => (
            <section key={module.id} className="card overflow-hidden p-0">
              <header className="flex items-center gap-2 border-b border-border bg-background/60 py-2 pl-4 pr-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                    {format(t.courses.module, { n: moduleIndex + 1 })}
                  </p>
                  <h3 className="truncate font-extrabold">{pick(locale, module.titleUz, module.titleRu)}</h3>
                </div>
                <MoveButtons
                  t={t}
                  up={moveModule.bind(null, module.id, -1)}
                  down={moveModule.bind(null, module.id, 1)}
                  isFirst={moduleIndex === 0}
                  isLast={moduleIndex === course.modules.length - 1}
                />
                <FormDialog
                  t={t}
                  title={t.courses.editModule}
                  trigger={<Pencil size={16} />}
                  triggerLabel={t.courses.editModule}
                  triggerClassName="btn btn-ghost p-1.5"
                  action={updateModule.bind(null, module.id)}
                  submitLabel={t.common.save}
                >
                  <BilingualFields t={t} values={module} />
                </FormDialog>
                <form action={deleteModule.bind(null, module.id)}>
                  <SubmitButton
                    className="btn btn-ghost p-1.5 hover:text-danger"
                    confirmText={t.courses.deleteModuleConfirm}
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </SubmitButton>
                </form>
              </header>

              {module.lessons.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">{t.courses.noLessons}</p>
              ) : (
                <ol className="divide-y divide-border">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.id} className="py-1.5 pl-4 pr-2">
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-bold text-muted">
                          {firstLessonNumber[moduleIndex] + lessonIndex}
                        </span>
                        <Link
                          href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                          className="min-w-0 flex-1 truncate py-1.5 font-semibold hover:text-primary"
                        >
                          {pick(locale, lesson.titleUz, lesson.titleRu)}
                        </Link>
                        {!lesson.isPublished && <Badge>{t.courses.draft}</Badge>}
                        <FormDialog
                          t={t}
                          title={t.assignments.create}
                          trigger={
                            <>
                              <ClipboardPlus size={16} />
                              <span className="hidden sm:inline">{t.assignments.addShort}</span>
                            </>
                          }
                          triggerLabel={t.assignments.create}
                          triggerClassName="btn btn-ghost px-2 py-1.5 text-xs"
                          action={createAssignment.bind(null, lesson.id)}
                          submitLabel={t.common.create}
                        >
                          <BilingualFields t={t} />
                        </FormDialog>
                        <MoveButtons
                          t={t}
                          up={moveLesson.bind(null, lesson.id, -1)}
                          down={moveLesson.bind(null, lesson.id, 1)}
                          isFirst={lessonIndex === 0}
                          isLast={lessonIndex === module.lessons.length - 1}
                        />
                      </div>

                      {lesson.assignments.length > 0 && (
                        <ul className="mb-1 ml-10 mt-0.5 space-y-0.5">
                          {lesson.assignments.map((assignment) => (
                            <li key={assignment.id}>
                              <Link
                                href={`/admin/courses/${course.id}/lessons/${lesson.id}/assignments/${assignment.id}`}
                                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-background hover:text-primary"
                              >
                                <ClipboardList size={15} className="shrink-0 text-primary" />
                                <span className="min-w-0 flex-1 truncate">{pick(locale, assignment.titleUz, assignment.titleRu)}</span>
                                {!assignment.isPublished && <Badge>{t.courses.draft}</Badge>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              <div className="border-t border-border px-2 py-1.5">
                <FormDialog
                  t={t}
                  title={t.courses.addLesson}
                  trigger={
                    <>
                      <Plus size={16} />
                      {t.courses.addLesson}
                    </>
                  }
                  triggerClassName="btn btn-ghost px-3 py-1.5 text-sm"
                  action={createLesson.bind(null, module.id)}
                  submitLabel={t.common.create}
                >
                  <BilingualFields t={t} />
                </FormDialog>
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-4 text-lg font-extrabold">{t.courses.settings}</h2>
            <ActionForm action={updateCourse.bind(null, course.id)} submitLabel={t.common.save}>
              <div className="grid gap-4">
                <BilingualFields t={t} values={course} withDescription />
              </div>
            </ActionForm>
          </section>

          <AttachmentsManager
            t={t}
            target="course"
            targetId={course.id}
            items={course.attachments}
            addLink={addLinkAttachment.bind(null, "course", course.id)}
            deleteAttachment={deleteAttachment}
          />

          <section className="card">
            <h2 className="text-lg font-extrabold">{t.courses.access}</h2>
            <p className="mb-4 mt-1 text-xs text-muted">{t.courses.accessHint}</p>
            <ActionForm action={setCourseGroups.bind(null, course.id)} submitLabel={t.common.save}>
              <CheckboxList
                name="groupIds"
                options={groups.map((g) => ({ value: g.id, label: g.name, hint: g.isArchived ? t.groups.archived : undefined }))}
                defaultSelected={course.groups.map((g) => g.groupId)}
                emptyText={t.groups.empty}
                searchPlaceholder={t.common.search}
              />
            </ActionForm>
          </section>

          <section className="rounded-2xl border border-danger/30 bg-surface p-5">
            <h2 className="text-sm font-extrabold text-danger">{t.common.dangerZone}</h2>
            <p className="mb-3 mt-1 text-xs text-muted">{t.courses.deleteHint}</p>
            <form action={deleteCourse.bind(null, course.id)}>
              <SubmitButton className="btn bg-danger text-on-color hover:bg-danger/90" confirmText={t.common.confirmDelete}>
                <Trash2 size={18} />
                {t.common.delete}
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
