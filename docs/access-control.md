# Access control

Two separate questions: *who is this* (sessions and roles) and *what may this student open yet*
(lesson order).

## Sessions

- The session is a signed JWT in the `cubick_session` cookie
  ([`src/lib/session-token.ts`](../src/lib/session-token.ts)), signed with `SESSION_SECRET` (`jose`).
- The payload carries `userId`, `role`, `sv` (the user's `sessionVersion`) and `remember`.
- Cookies are `Secure` only over HTTPS — a plain-http LAN address must not get `Secure`, or the
  browser drops the cookie.
- Resetting a password bumps `User.sessionVersion`, which invalidates every token issued earlier.
- The token expires in 12 hours; with "remember me" the cookie lives 180 days and the proxy re-signs
  it at most once a day (sliding expiration).
- Login attempts are rate limited ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts)): 10 per 15
  minutes per `ip:login`. The counter lives in process memory, so it only protects a single
  instance. Unknown logins are still compared against a dummy hash, so timing does not reveal who
  exists.
- `SESSION_SECRET` must be at least 32 characters or signing throws at request time.

## Roles

`src/proxy.ts` guards the areas by prefix (`/admin`, `/student`, `/parent`, plus `/`, `/ru`,
`/login`) and redirects anyone in the wrong area. Server code calls `requireUser("ADMIN")` from
[`src/lib/auth.ts`](../src/lib/auth.ts) before any privileged action — the proxy is a convenience, the
check in the action is the real guard.

## Which lessons a student may open

Implemented in [`src/lib/learning.ts`](../src/lib/learning.ts).

`studentCourseWhere(userId)` — published courses opened for at least one of the student's groups.

`getOpenLessonIds(userId, courseId?)` walks each course's published lessons in order
(module order, then lesson order) and opens a lesson when **any** of these holds:

1. the previous lesson is *finished* — every published task of it has a submission (any status); a
   lesson without tasks counts once `LessonProgress` exists;
2. its index is below the group's `GroupCourse.openLessons` (the teacher opened the first N lessons;
   the largest value among the student's groups wins);
3. the teacher opened this exact lesson for this student (`StudentLessonAccess`).

The first lesson is always open, and lessons after a manually opened one keep opening in order.

`studentOpenAssignmentWhere(userId)` returns the Prisma filter for tasks a student may work on:
published tasks of open lessons, **or** tasks opened for them personally
(`StudentAssignmentAccess`).

Every path that reads a task uses that filter — the task page, the task list, draft save and submit,
deadline reminders, the progress report and the `/results` route — so a locked task cannot be reached
by guessing its URL.

## Where the teacher changes this

| UI | Effect |
|---|---|
| Course page → "Guruhlar uchun ruxsat" | `GroupCourse` rows: which groups see the course at all |
| Course page → "Darslarni oldindan ochish" | `GroupCourse.openLessons` per group |
| Student page → "Darslar va topshiriqlarga ruxsat" | `StudentLessonAccess` / `StudentAssignmentAccess` |

## Sandboxing student code

Student HTML/CSS/JS runs in iframes **without** `allow-same-origin`
(`sandbox="allow-scripts allow-modals allow-forms allow-popups"`), both in the preview
([`src/components/code/PreviewPane.tsx`](../src/components/code/PreviewPane.tsx)) and in the autotest
runner. The document is built by `buildPreviewDocument` / `buildTestDocument`, which also inject the
console bridge and `<base href="/media/">`.

Uploaded files are served by [`src/app/files/[...path]/route.ts`](../src/app/files/%5B...path%5D/route.ts)
to signed-in users only, with a restrictive `Content-Security-Policy`.
