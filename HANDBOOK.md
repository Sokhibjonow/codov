# codov — developer handbook

Everything needed to work on this codebase: what it is, how to run it, how it is written, the
recipes for the usual changes, and the traps. Deeper reference lives in [`docs/`](docs/README.md);
this page is the one to read first and the one to keep honest.

---

## 1. What this is

A learning platform for a programming school in Andijan. One deployment serves:

- a **public page** (`/` in Uzbek, `/ru` in Russian) with a sign-up form;
- the **teacher's area** (`/admin`): groups, students, parents, courses, review queue, chat, stats;
- the **student's area** (`/student`): lessons, tasks with a code editor and live preview,
  autotests, progress, chat;
- the **parent's area** (`/parent`): their children's progress and a chat with the teacher.

One teacher, tens of students. Everything is bilingual (uz / ru). Production is
**https://www.codov.uz** on Vercel with a Neon database.

**Stack:** Next.js 16 (App Router, server actions) · TypeScript · Tailwind 4 · Prisma 7 ·
PostgreSQL · Monaco / CodeMirror · Gemini for AI review.

---

## 2. Run it

```bash
npm install                      # also runs prisma generate + copies Monaco into public/
npm run db:migrate               # create the schema in the local database
npm run create-admin             # teacher account; the password is printed once
npm run dev                      # http://localhost:3000
```

`.env` needs at least `DATABASE_URL` and `SESSION_SECRET` (32+ characters). Optional:
`GEMINI_API_KEY` (AI review), `UPLOAD_DIR`, the Blob tokens. The Russian [`README.md`](README.md) has
the full setup, including the VPS and Vercel paths.

Checks that must pass before anything is pushed:

```bash
npm run typecheck
npm run lint
```

---

## 3. Map

```
src/app/            routes. /(landing) /ru /login /admin /student /parent
                    plus /api, /files, /results — these authenticate themselves
src/components/     UI grouped by area: admin, learn, code, autotests, chat, review,
                    progress, shell, ui, landing, markdown, attachments
src/lib/            the logic: db, auth, session, learning, autotests, preview,
                    integrity, chat/, ai/, uploads, notifications, progress, import
src/i18n/           dictionaries (ru.ts is the type source) + locale plumbing
src/proxy.ts        role gate for the cabinet areas, landing language pinning
prisma/             schema.prisma and migrations
public/media/       pictures that lessons and tasks reference
scripts/            create-admin, move-to-vercel, copy-monaco, pack-for-server
docs/               deeper reference per subsystem
```

Course sources (lesson texts, model solutions, handouts) are **not** in this repository — they
contain the answers. They live with the teacher's materials.

---

## 4. How a request flows

1. **`src/proxy.ts`** matches `/`, `/ru`, `/login`, `/admin/*`, `/student/*`, `/parent/*`. It reads
   the session cookie, sends the wrong role to its own home, pins the landing language through the
   `x-codov-locale` header, and re-signs a remembered token at most once a day.
2. **The page** is a server component. It calls `requireUser(role)` and reads data through the shared
   Prisma client. No API layer in between.
3. **A change** is a server action returning `ActionState`, rendered by `ActionForm` / `FormDialog`.
4. **`/api/*`, `/files/*`, `/results/*`** are outside the proxy and check the session themselves.

---

## 5. Rules

### Code

**Server first.** `"use client"` only where the browser is needed: editors, dialogs, live updates.

**Every mutation is a server action** that starts with `requireUser(role)`, reads `getDictionary()`
for its messages, writes through Prisma, calls `revalidatePath`, and returns
`{ ok: true, message: t.common.saved }` — or `fail(t.common.errors.…)`. Read the form with
`formText` / `formList` (`src/lib/action-state.ts`).

**Access is re-checked where data is read.** The proxy only redirects. The guards that count are
`requireUser` and the filters in `src/lib/learning.ts`.

**Imports** use the `@/` alias; types use `import type`.

**Names.** A file exporting one component is named after it (`LessonAccess.tsx`); `src/lib` files are
lower-case (`learning.ts`). Functions read as verbs (`getOpenLessonIds`, `setStudentAccess`);
Prisma filter builders end in `Where`.

**Comments say why, in English, one line, above the non-obvious thing:**

```ts
// Lessons open in order: the next one opens once every task of the previous one is submitted.
```

No commented-out code, no stray `TODO`.

### UI

Tailwind plus the shared classes in `globals.css` (`card`, `btn`, `btn-primary`, `input`). Colours
come from CSS variables (`text-muted`, `bg-surface`, `border-border`, `text-primary`) so both themes
keep working — never hard-code a hex in a component. Icons are `lucide-react`.

**No user-visible string inside a component.** Text lives in `src/i18n/dictionaries/ru.ts` (the type
source) and `uz.ts`; components receive `t: Dictionary`. Both files change together and stay the same
length. Placeholders: `format(t.common.total, { count })`.

### Data

Schema changes go through Prisma migrations, never by hand on a server, and stay **additive**: new
tables are free, new columns need a default. Generate SQL rather than writing it from memory:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Content texts exist twice (`titleUz` / `titleRu`). Lists are ordered by `order ASC, createdAt ASC`.
Prefer deactivating (`isActive = false`) and archiving over deleting — nearly every relation
cascades. Model details: [docs/database.md](docs/database.md).

### Security

- Student code runs in iframes **without** `allow-same-origin`. Do not relax that sandbox.
- Answers and locked tasks are served from `/results/…` behind the access filters — never inlined
  into a page a student can view-source.
- Uploads are allow-listed by extension **and** verified by magic bytes; `/files/…` stays behind a
  session check.
- Secrets live in the environment and are never printed, logged or committed — including the
  production connection string in `.env.neon`.
- Passwords are shown once at creation and can only be reset, never read back.

### Git

`landing-demo` is the working branch, `main` is live. Nothing reaches `main` until the change has
been checked and the teacher asks for it to be published.

Commit subjects: English, one line, what changed and why, no `feat:`-style prefixes — the existing
log is the reference:

```
Lessons open in order: the next one after every task of the previous is submitted
Autotests: border/outline width checks need a style on the probe
```

Never commit `.env*`, course sources, or anything under `scripts/tmp`.

---

## 6. The domain in one screen

**Content tree:** `Course → Module → Lesson → Assignment`, every text bilingual, everything ordered.
A `GroupCourse` row opens a course for a group.

**Who sees what** (`src/lib/learning.ts`):

- `studentCourseWhere(userId)` — published courses opened to the student's groups.
- `getOpenLessonIds(userId, courseId?)` — lessons in order; the next one opens when every published
  task of the previous has a submission (any status). The teacher can also open the first N lessons
  for a group (`GroupCourse.openLessons`) or one lesson for one student (`StudentLessonAccess`).
- `studentOpenAssignmentWhere(userId)` — tasks of open lessons **plus** tasks opened personally
  (`StudentAssignmentAccess`). Every read path uses it: task page, task list, drafts, submit,
  reminders, reports, `/results`.

**Doing a task:** three files (`index.html`, `style.css`, `script.js`), live preview, autotests, and
an integrity recording of how the code was written. Submitting creates a `Submission`
(`NEEDS_REVIEW`) with the autotest results, the integrity summary and the recording; the editor locks
until the teacher accepts or returns it. The teacher's browser re-runs the autotests — the student's
own run is not trusted. Details: [docs/student-workspace.md](docs/student-workspace.md).

**AI review** (optional per assignment, needs `GEMINI_API_KEY`) grades completion and estimates how
likely the code was hand-written. State lives on the submission, claiming is atomic, three attempts,
rows stuck in `RUNNING` for three minutes are re-queued.

---

## 7. Recipes

### Add an admin section with a save action

1. **Action** in the area's `actions.ts`:

```ts
/** What this changes and why it exists. */
export async function setSomething(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();
  // …read with formText/formList, validate, write with prisma
  revalidatePath("/", "layout");
  return { ok: true, message: t.common.saved };
}
```

2. **Section** as a server component rendering `<ActionForm action={setSomething.bind(null, id)} submitLabel={t.common.save}>`.
3. **Dictionary keys** in both `ru.ts` and `uz.ts`, in the same place in the object.
4. `npm run typecheck && npm run lint`.

### Change the schema

1. Edit `prisma/schema.prisma` (keep the change additive).
2. `npm run db:migrate` locally — or write the migration folder by hand using `migrate diff`.
3. Update [docs/database.md](docs/database.md) in the same commit.
4. Deploying runs `prisma migrate deploy` before the new code serves.

### Add or change a lesson

Either edit it in the admin UI, or author it in the content folder and import it — see
[docs/content-pipeline.md](docs/content-pipeline.md). Rules that do not bend: both languages, named
colours only, no emoji, the model solution scores 100 % and the starter 0 %, a lesson whose tasks are
not ready is imported with `isPublished: false`.

### Add a picture that tasks can use

Drop it into `public/media` and commit it. Student code and lesson examples reference it by name
(`img12.jpg`, `img/img12.jpg`) because every preview and test document gets `<base href="/media/">`.

### Write an autotest

Rule types and the traps (percentages become pixels, shorthands expand, hover cannot be tested) are
in [docs/autotests.md](docs/autotests.md). Always verify with the content checker: solution 100 %,
starter 0 %.

### Release

```powershell
git checkout main; if ($?) { git pull --ff-only origin main }; if ($?) { git merge --ff-only landing-demo }; if ($?) { git push origin main }; git checkout landing-demo
```

PowerShell 5.1 has no `&&`, hence the `if ($?)` chain. Vercel builds on push and the site is live in
2–3 minutes.

---

## 8. Traps

- **Internal names still say `cubick`**: `cubick_session`, `cubick_locale`, `cubick_theme`,
  `globalThis.__cubick*`, and the preview `postMessage` markers. Renaming logs everyone out and
  breaks open pages — a deliberate migration, not a cleanup.
- **Three pieces of state live in process memory**: the login/lead rate limiter, the chat send
  limiter and the chat event bus. They do not survive scale-out; polling is the safety net.
- **`process.env.VERCEL` changes behaviour** in four places: AI timeouts and pacing, realtime
  transport (polling instead of SSE), uploads (direct-to-Blob, because a function body is capped
  around 4.5 MB) and file serving (redirect instead of streaming).
- **Computed styles, not source text.** An autotest `style` rule compares computed values;
  percentages arrive as pixels.
- **A published lesson with no tasks counts as finished** and lets students skip ahead.
- **Content is matched by `Lesson.slug` / `Assignment.key`, not by order.** Matching by order once
  re-pointed a student's submission to a different task when a lesson was inserted in the middle.
- **The dev server caches the Prisma client.** After changing the schema, restart it, or you get
  `Cannot read properties of undefined (reading 'findMany')`.
- **Deleting cascades.** Removing a user removes their submissions, drafts, messages and progress.

---

## 9. Where to look next

| Page | What it answers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Subsystems in more detail: chat, uploads, AI, i18n, landing |
| [docs/database.md](docs/database.md) | Every model and relation |
| [docs/access-control.md](docs/access-control.md) | Sessions, roles, lesson order |
| [docs/student-workspace.md](docs/student-workspace.md) | Editor, preview, integrity, submission flow |
| [docs/autotests.md](docs/autotests.md) | Rule types, gotchas, checking a task |
| [docs/content-pipeline.md](docs/content-pipeline.md) | Authoring and importing course content |
| [docs/operations.md](docs/operations.md) | Environments, variables, scripts, backups |

Guides for the teacher (Russian) live with the course materials in `Documents/codov/docs`.
