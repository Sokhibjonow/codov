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
`/login`, `/register`) and redirects anyone in the wrong area. Server code calls `requireUser("ADMIN")` from
[`src/lib/auth.ts`](../src/lib/auth.ts) before any privileged action — the proxy is a convenience, the
check in the action is the real guard.

## Which lessons a student may open

Implemented in [`src/lib/learning.ts`](../src/lib/learning.ts).

`studentCourseWhere(userId)` — published courses opened for at least one of the student's groups.

`getOpenLessonIds(userId, courseId?)` walks each course's published lessons in order
(module order, then lesson order) and opens a lesson when **any** of these holds (a trial student
follows the rules in the next section instead):

1. the previous lesson is *finished* — the teacher **accepted** every published task of it (a
   submission with status `ACCEPTED`; submitted or returned work does not count); a lesson without
   tasks counts once `LessonProgress` exists;
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

## Free trial (self sign-up)

`/register` lets anyone create a student account (`User.selfRegistered`): login is the phone number
without `+` (`998901234567`), the password is their own. The visitor picks a course: the form lists every
published course linked to an active trial group (`getTrialCourses` in `src/lib/trial.ts`), and the account
joins the newest trial group with that course. Keep one trial group per course ("Sinov · START",
"Sinov · JavaScript") so each has its own offer; with no trial group the page says registration is closed.
Each sign-up also creates a `Lead` named "Name · Course" and a `lead.new` notification so the teacher
can call back. Registrations are rate limited to 10
per 15 minutes per IP, and a hidden `website` field catches form bots.

A student whose every group linked to a course is a trial group (`courseAccess` in `learning.ts`):

- opens the next lesson once every task of the previous one is **submitted** (any status but
  `RETURNED`) — no teacher review needed, so the first experience is instant;
- never gets past the first `Group.trialLessons` lessons, whatever else applies.

As soon as the teacher adds the student to a regular group with the course, the usual rules apply.
Trial students see an offer card (`getTrialOffer`, `TrialOffer.tsx`) on the dashboard, the course page,
the last free lesson and every lesson past the free part: start date (`offerStart`), seats left
(`offerSeats`) and a sign-up link (`offerLink`, Telegram by default). Trial groups have no group chat
for students — sign-ups are strangers to each other.

## Where the teacher changes this

| UI | Effect |
|---|---|
| Course page → "Guruhlar uchun ruxsat" | `GroupCourse` rows: which groups see the course at all |
| Course page → "Darslarni oldindan ochish" | `GroupCourse.openLessons` per group |
| Group page → "Sinov guruhi" | `Group.isTrial`, `trialLessons` and the offer fields |
| Student page → "Darslar va topshiriqlarga ruxsat" | `StudentLessonAccess` / `StudentAssignmentAccess` |

## Sandboxing student code

Student HTML/CSS/JS runs in iframes **without** `allow-same-origin`
(`sandbox="allow-scripts allow-modals allow-forms allow-popups"`), both in the preview
([`src/components/code/PreviewPane.tsx`](../src/components/code/PreviewPane.tsx)) and in the autotest
runner. The document is built by `buildPreviewDocument` / `buildTestDocument`, which also inject the
console bridge and `<base href="/media/">`.

Uploaded files are served by [`src/app/files/[...path]/route.ts`](../src/app/files/%5B...path%5D/route.ts)
to signed-in users only, with a restrictive `Content-Security-Policy`.
