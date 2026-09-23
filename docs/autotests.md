# Autotests

Every assignment carries a list of rules in `Assignment.tests` (JSON). The rules are validated by
`autotestRuleSchema` in [`src/lib/autotests.ts`](../src/lib/autotests.ts) — the same schema is used by
the admin editor and by the content import script, so a broken rule can never reach the database.

A rule is `{ id, points, type, … }`. `id` is free text (shown in the results), `points` is the weight,
1–100. The score is the share of earned points, rounded.

## Rule types

| Type | Fields | Passes when |
|---|---|---|
| `exists` | `selector`, `min` | at least `min` elements match |
| `count` | `selector`, `count` | exactly `count` elements match |
| `text` | `selector`, `text` | some matching element contains the text (case-insensitive, whitespace collapsed) |
| `attribute` | `selector`, `attribute`, `value` | some matching element has the attribute with that value (empty `value` = attribute present) |
| `style` | `selector`, `property`, `value` | the **computed** style of the first match equals the value |
| `click` | `selector`, `target`, `text` | after clicking `selector`, `target` contains `text` |
| `input` | `selector`, `value`, `button`, `target`, `text` | after typing into `selector` and clicking `button`, `target` contains `text` |
| `console` | `text` | the page logged that text |
| `noErrors` | — | the page threw no errors |
| `code` | `file` (`html`/`css`/`js`), `pattern` | the source contains the pattern (case-insensitive substring) |

## How they run

Browser rules run in a sandboxed iframe built by `buildTestDocument`
([`src/lib/autotest-runner.ts`](../src/lib/autotest-runner.ts)): the student's HTML, CSS and JS plus a
small runner that evaluates the rules and posts the results back. The frame has no
`allow-same-origin`, so student code can never touch the platform.

`code` rules never reach the browser — they are evaluated server-side by `runCodeRules`.

Results are stored on the submission (`autotestResults`, `autotestScore`) and re-rendered from there.

## Writing rules that hold

**Computed values, not source text.** A `style` rule compares against the computed value, which the
runner canonicalises through a probe element. So `value: "tomato"` matches `tomato`, and
`value: "cover"` matches `background-size: cover`.

**Percentages become pixels.** `top: 50%` computes to something like `140px`, and the pixel value
depends on the container. Check percentages with a `code` rule instead:
`{ type: "code", file: "css", pattern: "top: 50%" }`.

**Shorthands expand.** Test `border-top-left-radius`, not `border-radius`; `padding-top`, not `padding`.

**Borders need a style.** `border-*-width` computes to `0px` unless a `border-style` is set, which used
to produce false failures — prefer `border-top-style` / `border-top-color`, or a `code` rule.

**Hover cannot be tested.** The runner does not move a mouse. Check the resting styles and that the
`:hover` rule exists (`code` rule), and leave the motion to the teacher.

**Do not test what the starter already contains.** After writing the rules, run the checker below: the
model solution must score 100 % and the starter code 0 %. If the starter passes a rule, either the rule
is too weak or the hint in the starter gives it away.

**Selectors are what the student sees.** A rule like `img[src^='https://www.codov.uz/media/']` is shown
verbatim in the task's test list, so keep selectors short and readable.

## Checking a task before it ships

The content repo (outside this repository) has `check-tasks.mts`, which loads every task, builds the
real test document with `buildTestDocument` and runs it in headless Edge:

```
c1/l09/maket: solution 16/16 · starter passes 0
```

Both halves matter: a solution that fails means the rules are wrong; a starter that passes means the
rule is free.
