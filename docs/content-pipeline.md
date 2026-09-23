# Course content

Lessons can be written in two places:

- **In the admin UI** — good for fixing a typo, adding one task, editing a test.
- **In the content folder** — the way the whole START course is authored. The folder lives *outside*
  this repository on purpose: it holds the model solutions, and this repository is public.

## Folder layout

```
platforma/
  course.mjs            COURSE (title, description) and MODULES (cycles → lesson folders)
  solutions.mjs         model solution per task, used by the checker
  c1/l09/
    tasks.mjs           LESSON (titles, isPublished) and TASKS (titles, starters, tests)
    lesson.uz.md        the lesson page, Uzbek
    lesson.ru.md        the lesson page, Russian
    maket.uz.md         one task description per language…
    maket.ru.md
    maket.css           target CSS and HTML: the model solution and the picture in the task
    target-maket.html
    build-md.mjs        writes the .md files from one place (text + expected result)
```

`tasks.mjs` exports:

```js
export const LESSON = { titleUz, titleRu, isPublished: false };   // isPublished defaults to true
export const TASKS = [{ key, titleUz, titleRu, topic, maxScore, starterHtml, starterCss, tests }];
```

`key` ties the task to its `key.uz.md` / `key.ru.md` texts and to `solutions.mjs`.
`topic` is passed to the AI reviewer as context for what "age-appropriate code" means here.

## Import

`import-course.mts` (in the content repo's scripts) upserts the whole tree:

- courses, modules, lessons and assignments are matched **by order**, not by id;
- texts, starters and tests are overwritten on every run;
- **nothing is ever deleted** — removing a lesson from `course.mjs` leaves it in the database;
- rules are validated with `autotestRuleSchema` before writing, so a bad test aborts the import.

Run it against the local database first, then against production via the `with-neon.mjs` wrapper.
Set `LESSON.isPublished = false` for a lesson whose tasks are not ready: a published lesson with no
tasks counts as "finished" and lets students skip ahead.

## Markdown in lessons and tasks

Standard Markdown (GFM tables included) plus three conventions:

| Fence | What the student sees |
|---|---|
| ```` ```html-live ```` | the code **and** the rendered result in a sandboxed frame |
| ```` ```html-result ```` | the result only — the code stays hidden (used for "the result must look like this") |
| a bare YouTube link on its own line | an embedded player |

Raw inline HTML in Markdown is **not** rendered — write `x²` and `H₂O` instead of `<sup>`/`<sub>`.

`html-result` blocks are not inlined into the page: the frame loads them from
`/results/<target>/<id>/<lang>/<index>` ([`route.ts`](../src/app/results/%5Btarget%5D/%5Bid%5D/%5Blang%5D/%5Bindex%5D/route.ts)),
which re-checks that this student may open that lesson or task. That is what keeps the answer out of
the page source.

## Pictures

Relative image paths in student code, in lesson examples and in test documents resolve to
`public/media` — every preview document gets `<base href="/media/">` (`MEDIA_BASE` in
[`src/lib/preview.ts`](../src/lib/preview.ts)). So `img12.jpg` and `img/img12.jpg` behave like files
sitting next to the page, which is what the lesson about relative URLs teaches.

`public/media` currently holds `img12.jpg`, `img/img12.jpg`, `fon.jpg`, `img1.jpg`, `img2.jpg`,
`img3.jpg` and `codov-fon.png` (the codov watermark used by the layout tasks).

## House rules for content

- Colours by name only (`tomato`, `midnightblue`, `whitesmoke`) — no `#` codes.
- No emoji.
- Every lesson and task exists in both languages.
- The model solution scores 100 %, the starter 0 % (see [autotests.md](autotests.md)).
- Printable handouts mirror the lesson: page 1 the theory, then one page per task with the expected result.
