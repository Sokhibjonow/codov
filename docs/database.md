# Database

PostgreSQL, accessed through Prisma 7 (`@prisma/adapter-pg`). The schema lives in
[`prisma/schema.prisma`](../prisma/schema.prisma); the generated client is written to
`src/generated/prisma` and imported as `@/generated/prisma/client`.

Every query goes through the single client in [`src/lib/db.ts`](../src/lib/db.ts).

## Model map

### People

| Model | What it holds |
|---|---|
| `User` | One row per person. `role` is `ADMIN` (the teacher), `STUDENT` or `PARENT`. Login is unique, the password is a bcrypt hash. |
| `ParentChild` | Links a parent to a child. |
| `Group` | A study group; can be archived instead of deleted. |
| `GroupMember` | Student ↔ group. |
| `AttendanceRecord` | One row per student per day with `PRESENT / ABSENT / LATE / EXCUSED`. |

`User.sessionVersion` is bumped on a password reset, which invalidates every session token
issued before (see [access-control.md](access-control.md)).

### Learning content

| Model | What it holds |
|---|---|
| `Course` → `Module` → `Lesson` → `Assignment` | The content tree. Every text exists twice: `…Uz` and `…Ru`. |
| `GroupCourse` | Opens a course for a group. `openLessons` lets the teacher open the first N lessons regardless of progress. |
| `LessonProgress` | The student marked a lesson as done. |
| `Attachment` | A file or link attached to a course, lesson or assignment (exactly one of the three ids is set). |
| `AssignmentDeadline` | Due date per assignment per group. |

Ordering is always `order ASC, createdAt ASC` — new rows keep a stable place when several share an `order`.

Lesson content is Markdown with a few custom fences; see [content-pipeline.md](content-pipeline.md).
`Assignment.tests` is JSON validated by `autotestRuleSchema`; see [autotests.md](autotests.md).

### Per-student access

| Model | What it holds |
|---|---|
| `StudentLessonAccess` | The teacher opened one lesson for one student ahead of the usual order. |
| `StudentAssignmentAccess` | Same, for a single task. |

### Student work

| Model | What it holds |
|---|---|
| `CodeDraft` | Autosaved work in progress, one row per student per assignment, plus the integrity counters and the edit recording. |
| `Submission` | A sent attempt: the three files, autotest results and score, the AI report, the teacher's score and comment, and the integrity snapshot. |

`Submission.status`: `SUBMITTED` → `NEEDS_REVIEW` (checks done) → `ACCEPTED` or `RETURNED`.
`Submission.aiStatus`: `NONE / QUEUED / RUNNING / DONE / FAILED`.

### Chat, notifications, leads

| Model | What it holds |
|---|---|
| `Chat`, `ChatMember`, `Message` | `DIRECT` chats are keyed by `directKey` (both user ids sorted, joined with `:`), so a pair has exactly one chat. `GROUP` chats belong to a group. Messages are soft-deleted with `deletedAt`. |
| `Notification` | Per user, `type` + free-form `data`, `readAt` for the unread badge. |
| `Lead` | Sign-up request from the public page: name, phone, `NEW` / `CONTACTED`. |

## Cascades

Almost every relation is `onDelete: Cascade`. Deleting a `User` therefore deletes their drafts,
submissions, chat membership, messages, progress and access rows. Deleting a `Course` removes its
modules, lessons, assignments and every submission under them.

In the admin UI, prefer deactivating a user (`isActive = false`) or archiving a group over deleting.

## Migrations

```bash
npm run db:migrate     # create + apply a migration locally, then regenerate the client
npm run db:deploy      # apply pending migrations (what the Vercel build runs)
npm run db:studio      # browse the data
```

The Vercel build script is `prisma migrate deploy && next build`, so a deploy applies pending
migrations before the new code starts serving.

When a migration has to be written by hand, generate the SQL instead of guessing:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Additive changes only on a live database: new columns need a default, new tables are free.
A destructive change needs a separate data-moving step.
