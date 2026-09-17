import { ClipboardList, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/BackLink";
import { BilingualFields } from "@/components/admin/BilingualFields";
import { FormDialog } from "@/components/admin/FormDialog";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/learning";
import { AttachmentsManager } from "@/components/attachments/AttachmentsManager";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { deleteLesson, setLessonPublished, updateLesson } from "../../../actions";
import { createAssignment } from "../../../assignment-actions";
import { addLinkAttachment, deleteAttachment } from "../../../attachment-actions";
import { LessonEditor } from "./LessonEditor";

type Params = Promise<{ id: string; lessonId: string }>;

export default async function LessonEditorPage({ params }: { params: Params }) {
  await requireUser("ADMIN");
  const { id, lessonId } = await params;
  const { t, locale } = await getDictionary();

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { courseId: id } },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      contentUz: true,
      contentRu: true,
      isPublished: true,
      module: { select: { titleUz: true, titleRu: true, course: { select: { titleUz: true, titleRu: true } } } },
      assignments: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, titleUz: true, titleRu: true, isPublished: true, maxScore: true },
      },
      attachments: { orderBy: attachmentOrder, select: attachmentSelect },
    },
  });
  if (!lesson) notFound();

  return (
    <>
      <BackLink href={`/admin/courses/${id}`} label={pick(locale, lesson.module.course.titleUz, lesson.module.course.titleRu)} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
            {pick(locale, lesson.module.titleUz, lesson.module.titleRu)}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{pick(locale, lesson.titleUz, lesson.titleRu)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={lesson.isPublished ? "success" : "neutral"}>
              {lesson.isPublished ? t.courses.published : t.courses.draft}
            </Badge>
            {!lesson.isPublished && t.lessons.lessonDraft}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={setLessonPublished.bind(null, lesson.id, !lesson.isPublished)}>
            <SubmitButton className={lesson.isPublished ? "btn border border-border bg-surface" : "btn btn-primary"}>
              {lesson.isPublished ? <EyeOff size={18} /> : <Eye size={18} />}
              {lesson.isPublished ? t.courses.unpublish : t.courses.publish}
            </SubmitButton>
          </form>
          <form action={deleteLesson.bind(null, lesson.id)}>
            <SubmitButton
              className="btn border border-border bg-surface text-danger hover:bg-danger-soft"
              confirmText={`${t.common.confirmDelete}\n${t.lessons.deleteHint}`}
              title={t.common.delete}
              aria-label={t.common.delete}
            >
              <Trash2 size={18} />
            </SubmitButton>
          </form>
        </div>
      </div>

      <section className="card mb-4 p-0">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 font-extrabold">
            <ClipboardList size={20} className="text-primary" />
            {t.assignments.lessonAssignments}
          </h2>
          <FormDialog
            t={t}
            title={t.assignments.create}
            trigger={
              <>
                <Plus size={16} />
                {t.assignments.create}
              </>
            }
            triggerClassName="btn border border-border bg-surface px-3 py-1.5 text-sm"
            action={createAssignment.bind(null, lesson.id)}
            submitLabel={t.common.create}
          >
            <BilingualFields t={t} />
          </FormDialog>
        </header>
        {lesson.assignments.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">{t.assignments.noAssignments}</p>
        ) : (
          <ul className="divide-y divide-border">
            {lesson.assignments.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/admin/courses/${id}/lessons/${lesson.id}/assignments/${assignment.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-background"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">{pick(locale, assignment.titleUz, assignment.titleRu)}</span>
                  <span className="text-xs text-muted">{format(t.assignments.maxScoreShort, { max: assignment.maxScore })}</span>
                  {!assignment.isPublished && <Badge>{t.courses.draft}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mb-4">
        <AttachmentsManager
          t={t}
          target="lesson"
          targetId={lesson.id}
          items={lesson.attachments}
          addLink={addLinkAttachment.bind(null, "lesson", lesson.id)}
          deleteAttachment={deleteAttachment}
        />
      </div>

      <LessonEditor t={t} lesson={lesson} saveAction={updateLesson.bind(null, lesson.id)} />
    </>
  );
}
