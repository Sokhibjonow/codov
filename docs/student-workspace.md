# Student workspace

Where a task is actually done: `/student/assignments/[id]`
([`Workspace.tsx`](../src/app/student/%28focus%29/assignments/%5Bid%5D/Workspace.tsx)). Three files —
`index.html`, `style.css`, `script.js` — a live preview, the task's autotests, and a recording of how
the code was written.

## Editor

[`CodeTabsEditor`](../src/components/code/CodeTabsEditor.tsx) picks the editor by pointer type:
Monaco on desktop, CodeMirror 6 on touch devices. Monaco is self-hosted from `public/monaco`
(`scripts/copy-monaco.mjs` runs on `postinstall`) — no CDN. Emmet expansion is wired for both.

## Preview

`buildPreviewDocument` ([`src/lib/preview.ts`](../src/lib/preview.ts)) assembles one HTML document
from the three files and adds:

- `<base href="/media/">` so relative image paths resolve to `public/media`;
- a one-line console/error bridge that `postMessage`s logs and errors to the parent (kept on one line
  so the student's script keeps its own line numbers).

The frame is sandboxed **without** `allow-same-origin`, so the page cannot reach the platform's
cookies or DOM. `PreviewPane` only accepts messages coming from its own frame, keeps the last 200 log
lines and debounces auto-run by 700 ms.

## Autotests

Rules come from the assignment; browser rules run in a hidden sandboxed frame built by
`buildTestDocument`, `code` rules are evaluated on the source. The rule list, the gotchas and how to
author tests are in [autotests.md](autotests.md).

The student can run the tests before submitting. The score that counts is the one produced when the
teacher opens the submission: the review page re-runs the tests in the teacher's browser and saves
the result (`saveAutotestResults`) — the student's own run is not trusted.

## Integrity recording

[`src/lib/integrity.ts`](../src/lib/integrity.ts) plus
[`useIntegrityRecorder`](../src/app/student/%28focus%29/assignments/%5Bid%5D/useIntegrityRecorder.ts).

Every document change is stored as `[time, fileIndex, from, to, text, kind]` where kind is typed,
pasted, Emmet, delete, undo/redo or other. Active time ticks every 5 s while the tab is visible and
the student is not idle; leaving the page is counted (clicking into the preview iframe is not).

The summary and the recording travel with the draft and end up on the submission, where the teacher
sees them as a card plus a replay player. Classification is corrected server-side: a "typed" insert
longer than 30 non-whitespace characters counts as a paste, a huge Emmet expansion counts as a paste,
and re-inserting the starter code does not. Flags include `mostlyPasted`, `largePaste`, `tooFast`,
`manyTabSwitches` and `replayMismatch` (replaying the events does not reproduce the submitted files).

Everything here arrives from the student's browser, so it is validated: ≤ 100 000 characters per
file, ≤ 20 000 events per segment, ≤ 1 000 000 characters of recording (oldest segments are trimmed
first). Treat the flags as a reason to look, not as proof.

## From draft to grade

1. The workspace loads the starter code or the saved `CodeDraft` and starts a recording segment.
2. Typing autosaves 1.5 s after it stops (`saveDraft`), merging the segment into the draft.
3. **Submit** (`submitWork`): autotests run, then a `Submission` is created with the next `attempt`,
   `status: NEEDS_REVIEW`, the autotest results and score, the integrity summary and the recording.
   The draft is reset to the submitted code so the next attempt records from scratch. The teacher gets
   a `submission.new` notification, and the AI queue is kicked when AI review is enabled.
4. The editor stays locked while the status is `SUBMITTED`, `NEEDS_REVIEW` or `ACCEPTED`. Only
   `RETURNED` reopens it.
5. The teacher reviews: score (required when accepting) and comment; `ACCEPTED` or `RETURNED`.
   The student and their parents are notified, and the page jumps to the oldest work still waiting.

`autotestScore` is a percentage of the rule points, independent of `Assignment.maxScore`. The AI's
own score is advisory and never becomes `Submission.score`.

## Access

A task page, a draft save, a submit, the task list, the reports and the `/results` blocks all go
through `studentOpenAssignmentWhere` — see [access control](access-control.md). A locked task cannot
be reached by guessing its URL.
