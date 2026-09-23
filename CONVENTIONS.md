# Conventions

How this project is written. New code should be indistinguishable from what is already here.
The "why" behind the subsystems is in [`docs/`](docs/README.md).

## Code

**Server first.** Pages and layouts are server components; `"use client"` only where the browser is
needed (editors, dialogs, live updates). Data is read straight from Prisma in the server component —
no API layer in between.

**Mutations are server actions.** They return `ActionState` (`src/lib/action-state.ts`) and are
rendered by `ActionForm` / `FormDialog`. Every action starts with `requireUser(role)` and reads
`getDictionary()` for its messages, then calls `revalidatePath` and returns
`{ ok: true, message: t.common.saved }`. Use `formText` / `formList` to read the form, `fail(...)`
to refuse.

**Access is re-checked where the data is read.** The proxy only redirects; the guard that counts is
`requireUser` plus the `studentCourseWhere` / `studentOpenAssignmentWhere` filters.

**Imports** use the `@/` alias, never long relative chains. Types are imported with `import type`.

**Naming.** Files that export one component are named after it (`LessonAccess.tsx`); helpers in
`src/lib` are lower-case (`learning.ts`). Functions read as verbs (`getOpenLessonIds`,
`setStudentAccess`, `ensureDeadlineReminders`); Prisma `where` builders end in `Where`.

**Comments explain why, not what.** One short line above the non-obvious thing, in English, like the
ones already in the code:

```ts
// Lessons open in order: the next one opens once every task of the previous one is submitted.
```

No commented-out code, no `TODO` left behind — either do it or open a task.

**Styling** is Tailwind plus the shared classes in `globals.css` (`card`, `btn`, `input`,
`btn-primary`). Colours come from the CSS variables (`text-muted`, `bg-surface`, `border-border`,
`text-primary`) so light and dark themes keep working — do not hard-code a hex value in a component.
Icons are `lucide-react`.

**No user-visible string in a component.** Text lives in `src/i18n/dictionaries/ru.ts` (the type
source) and `uz.ts`; components take `t: Dictionary`. Both files always change together and stay the
same length. Placeholders use `format(t.common.total, { count })`.

**Before pushing:** `npm run typecheck` and `npm run lint` must be clean.

## Database

Schema changes go through Prisma migrations, never by hand on the server. Keep them **additive**:
new tables are free, new columns need a default. Generate the SQL instead of writing it from memory:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Every content text exists twice (`…Uz` / `…Ru`). Lists are ordered by `order ASC, createdAt ASC`.
Prefer deactivating and archiving over deleting — most relations cascade.

## Course content

- Colours by **name** only: `tomato`, `midnightblue`, `whitesmoke`. No `#` codes anywhere a student
  can see them.
- **No emoji** in lessons, tasks, handouts or marketing. Icons instead.
- Every lesson and task exists in **uz and ru**.
- Autotests: the model solution scores **100 %**, the starter **0 %**. Check it with the task checker
  before importing; see [docs/autotests.md](docs/autotests.md).
- Lesson examples use ```` ```html-live ````; expected results use ```` ```html-result ```` so the
  answer never reaches the page source.
- Course sources live outside this repository — they contain the solutions.
- A lesson whose tasks are not ready is imported with `isPublished: false`, otherwise students can
  mark it done and skip ahead.

## Git

Branches: `landing-demo` for work, `main` is live. Nothing goes to `main` until the change has been
checked and the teacher has asked for it to be published.

Commit messages: English, one line, what changed and why, no prefixes like `feat:` — the existing log
is the reference:

```
Lessons open in order: the next one after every task of the previous is submitted
Autotests: border/outline width checks need a style on the probe
```

A longer body is welcome when the reason is not obvious. Do not commit `.env*`, content sources, or
anything under `scripts/tmp`.

## Security

- Student code runs in frames **without** `allow-same-origin`. Do not relax the sandbox.
- Answers and locked tasks are served through `/results/…` and the access filters — never inlined
  into a page the student can view-source.
- Uploads are allow-listed by extension **and** magic bytes; `/files/…` stays behind a session check.
- Secrets are read from the environment and never printed, logged or committed — including the
  production connection string in `.env.neon`.
- Passwords are shown once at creation; there is no way to read one back, only to reset it.

## Documentation

When behaviour changes, the page in `docs/` that describes it changes in the same commit. The Russian
guides for the teacher live with the course materials and are rebuilt into PDF from the same Markdown.
