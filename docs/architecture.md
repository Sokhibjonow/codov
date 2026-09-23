# Architecture

Next.js 16 (App Router, server actions) + TypeScript + Tailwind 4, PostgreSQL through Prisma 7.
One deployment serves the public page and three cabinets: teacher, student, parent.

```
src/app/            routes: / and /ru (landing), /login, /admin, /student, /parent,
                    plus /api, /files, /results
src/components/     UI by area: admin, learn, code, autotests, chat, review, progress, shell, ui
src/lib/            all the logic: db, auth, learning, autotests, preview, chat, ai, uploads…
src/i18n/           uz / ru dictionaries and locale plumbing
src/proxy.ts        role gate for the cabinet areas
prisma/             schema and migrations
public/media/       pictures the lessons and tasks use
```

Related pages: [database](database.md) · [access control](access-control.md) ·
[student workspace](student-workspace.md) · [autotests](autotests.md) ·
[course content](content-pipeline.md) · [operations](operations.md).

## Request flow

1. `src/proxy.ts` matches `/`, `/ru`, `/login`, `/admin/*`, `/student/*`, `/parent/*`. It reads the
   session cookie, redirects the wrong role, pins the landing language through the
   `x-codov-locale` header, and re-signs long-lived tokens at most once a day.
2. Pages are server components. They call `requireUser(role)` and read data through the shared
   Prisma client — the proxy is convenience, the check inside the action is the real guard.
3. Mutations are server actions returning an `ActionState` (`src/lib/action-state.ts`), rendered by
   `ActionForm`.
4. `/api/*`, `/files/*` and `/results/*` are outside the proxy and authenticate themselves.

## Subsystems

### Learning

`src/lib/learning.ts` answers "what may this student see": published courses opened to their groups,
which lessons are open, which tasks they may work on. Every read path uses those filters. See
[access control](access-control.md).

### Student workspace

Three-file editor, live preview, autotests, and an integrity recording that shows how the code was
written. See [student workspace](student-workspace.md).

### AI review

`src/lib/ai/*`. After a submission (when `Assignment.aiReviewEnabled` and `GEMINI_API_KEY` is set) a
Gemini call grades completion, estimates how likely the code was written by hand, lists errors and
writes bilingual feedback. State lives on the submission (`aiStatus`, `aiReport`, `aiAttempts`), so a
restart never loses work; claiming is an atomic `updateMany` on `QUEUED`, rows stuck in `RUNNING` for
3 minutes are re-queued, and there are at most 3 attempts. The prompt treats the student's code and
the task text as data, not instructions, and the model's answer is re-validated with Zod.
On Vercel the queue does not sleep between reviews and stops starting new ones 10 s into the request
(the function has 60 s).

### Chat and notifications

`src/lib/chat/*` plus `src/components/realtime/*`. One direct chat per teacher↔student and
teacher↔parent pair (keyed by both ids sorted), one chat per group; parents only get direct chats.
Delivery is SSE from `/api/chat/stream` with a `hello` frame and a 15 s heartbeat; if the frame does
not arrive in 6 s — or the app runs on Vercel — the client falls back to polling a server action
(3 s on a chat page, 20 s visible, 60 s hidden). The same channel carries notification pings; the
bell text is rendered client-side from `{type, data}`, so each viewer sees their own language.
Deadline reminders are created lazily when a student loads their notifications — there is no cron.

### Uploads

`src/lib/uploads.ts`. Locally files go under `UPLOAD_DIR` (outside `public/`, so access can be
checked); on Vercel they go to Blob, uploaded directly from the browser because a function body is
capped around 4.5 MB. Extensions are allow-listed and the magic bytes are verified; images are
capped at 10 MB, attachments at 50 MB. `/files/[...path]` serves them to signed-in users with a
restrictive CSP, and on Blob redirects to the unguessable object URL.

### i18n and theme

`src/i18n/*`: `uz` and `ru`, `ru.ts` is the source of the `Dictionary` type. Components receive
`t: Dictionary`. The locale comes from the `x-codov-locale` header on the landing routes, otherwise
from the cookie, default `uz`. Content rows are bilingual by column (`titleUz` / `titleRu`) and read
through `pick(locale, uz, ru)`. The theme is a cookie plus an inline script that sets
`data-theme` before the first paint; with no cookie the device setting wins.

### Public page

One `Landing` component at `/` (uz) and `/ru` (ru), with JSON-LD, per-language metadata,
`sitemap.ts` and `robots.ts` (cabinets, `/api`, `/files`, `/results` are disallowed). The sign-up
form posts to `submitLead`: honeypot field, `+998########` phone check, in-memory IP rate limit, then
a `Lead` row and a notification for the teacher.

## Things worth knowing before changing something

- **Internal names still say `cubick`**: cookies (`cubick_session`, `cubick_locale`, `cubick_theme`),
  `globalThis` keys and the preview `postMessage` markers. Renaming them logs everyone out and breaks
  open pages — do it deliberately, not as a cleanup.
- **Three pieces of state live in process memory** and do not survive more than one instance: the
  login/lead rate limiter, the chat send limiter and the chat event bus. Polling is the safety net.
- **`process.env.VERCEL` changes behaviour** in four places: AI timeouts and pacing, realtime
  transport, upload path, and file serving.
- **Student code must stay sandboxed.** Preview and test frames are built without
  `allow-same-origin`; keep it that way.
- **Answers must not reach the page source.** "Result only" blocks are fetched from `/results/…`,
  which re-checks access for that student.
