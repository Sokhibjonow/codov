import { CalendarClock, Eye, EyeOff, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import {
  deleteAssignment,
  setAssignmentDeadlines,
  setAssignmentPublished,
  updateAssignment,
} from "@/app/admin/courses/assignment-actions";
import { addLinkAttachment, deleteAttachment } from "@/app/admin/courses/attachment-actions";
import { AttachmentsManager } from "@/components/attachments/AttachmentsManager";
import { attachmentOrder, attachmentSelect } from "@/lib/attachments";
import { parseRules } from "@/lib/autotests";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/admin/BackLink";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toTashkentInput } from "@/lib/format";
import { pick } from "@/lib/learning";
import { AssignmentEditor } from "./AssignmentEditor";

type Params = Promise<{ id: string; lessonId: string; assignmentId: string }>;

export default async function AssignmentEditorPage({ params }: { params: Params }) {
  await requireUser("ADMIN");
  const { id, lessonId, assignmentId } = await params;
  const { t, locale } = await getDictionary();

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, lessonId, lesson: { module: { courseId: id } } },
    select: {
      id: true,
      titleUz: true,
      titleRu: true,
      descriptionUz: true,
      descriptionRu: true,
      topic: true,
      starterHtml: true,
      starterCss: true,
      starterJs: true,
      maxScore: true,
      aiReviewEnabled: true,
      tests: true,
      isPublished: true,
      deadlines: { select: { groupId: true, dueAt: true } },
      attachments: { orderBy: attachmentOrder, select: attachmentSelect },
      lesson: {
        select: {
          titleUz: true,
          titleRu: true,
          module: { select: { course: { select: { groups: { select: { group: { select: { id: true, name: true } } } } } } } },
        },
      },
    },
  });
  if (!assignment) notFound();

  const groups = assignment.lesson.module.course.groups.map((g) => g.group).sort((a, b) => a.name.localeCompare(b.name));
  const dueByGroup = new Map(assignment.deadlines.map((d) => [d.groupId, d.dueAt]));

  return (
    <>
      <BackLink href={`/admin/courses/${id}/lessons/${lessonId}`} label={pick(locale, assignment.lesson.titleUz, assignment.lesson.titleRu)} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{t.assignments.title}</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{pick(locale, assignment.titleUz, assignment.titleRu)}</h1>
          <p className="mt-1">
            <Badge tone={assignment.isPublished ? "success" : "neutral"}>
              {assignment.isPublished ? t.courses.published : t.courses.draft}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={setAssignmentPublished.bind(null, assignment.id, !assignment.isPublished)}>
            <SubmitButton className={assignment.isPublished ? "btn border border-border bg-surface" : "btn btn-primary"}>
              {assignment.isPublished ? <EyeOff size={18} /> : <Eye size={18} />}
              {assignment.isPublished ? t.courses.unpublish : t.courses.publish}
            </SubmitButton>
          </form>
          <form action={deleteAssignment.bind(null, assignment.id)}>
            <SubmitButton
              className="btn border border-border bg-surface text-danger hover:bg-danger-soft"
              confirmText={`${t.common.confirmDelete}\n${t.assignments.deleteHint}`}
              title={t.common.delete}
              aria-label={t.common.delete}
            >
              <Trash2 size={18} />
            </SubmitButton>
          </form>
        </div>
      </div>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <CalendarClock size={20} className="text-primary" />
          {t.assignments.deadlines}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t.assignments.deadlinesHint}</p>
        {groups.length === 0 ? (
          <p className="text-sm text-muted">{t.assignments.noGroups}</p>
        ) : (
          <ActionForm action={setAssignmentDeadlines.bind(null, assignment.id)} submitLabel={t.common.save}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const dueAt = dueByGroup.get(group.id);
                return (
                  <label key={group.id} className="block">
                    <span className="mb-1.5 block text-sm font-bold">{group.name}</span>
                    <input
                      type="datetime-local"
                      name={`deadline_${group.id}`}
                      defaultValue={dueAt ? toTashkentInput(dueAt) : ""}
                      className="input"
                    />
                  </label>
                );
              })}
            </div>
          </ActionForm>
        )}
      </section>

      <div className="mb-4">
        <AttachmentsManager
          t={t}
          target="assignment"
          targetId={assignment.id}
          items={assignment.attachments}
          addLink={addLinkAttachment.bind(null, "assignment", assignment.id)}
          deleteAttachment={deleteAttachment}
        />
      </div>

      <AssignmentEditor
        t={t}
        assignment={{ ...assignment, tests: parseRules(assignment.tests) }}
        saveAction={updateAssignment.bind(null, assignment.id)}
      />
    </>
  );
}
