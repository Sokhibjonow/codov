import type { Prisma } from "@/generated/prisma/client";
import { parseRules, parseResults } from "../autotests";
import { prisma } from "../db";
import { readSummary } from "../integrity";
import { GeminiError, geminiConfigured } from "./gemini";
import { reviewSubmission } from "./review";

// One-at-a-time background queue for AI reviews, paced for the free Gemini tier.
// Runs inside the web server; queued work survives restarts because the state lives in the database.
// On Vercel every call lives only as long as its request (after()), so a run takes at most one or two
// reviews and the next submission, the teacher's pages or the teacher's live updates pick up the rest.

const MIN_INTERVAL_MS = 7_000;
const MAX_ATTEMPTS = 3;
/** Longer waits (daily quota) stop the loop; the next submission or page visit restarts it. */
const MAX_INLINE_WAIT_MS = 2 * 60_000;
/** A review "running" longer than this was cut off (server restart, function timeout) and starts over. */
const STALE_RUNNING_MS = 3 * 60_000;
const SERVERLESS = Boolean(process.env.VERCEL);
/** On Vercel: don't start another review after this much time in one call (functions stop at 60 s). */
const SERVERLESS_START_WINDOW_MS = 10_000;

const state = globalThis as unknown as { __cubickAiQueue?: { running: Promise<void> | null } };
const queue = (state.__cubickAiQueue ??= { running: null });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts processing queued reviews if it isn't already running. Safe to call often.
 * Returns the run so after() keeps a serverless function alive until it ends.
 */
export function kickAiQueue(): Promise<void> {
  if (!geminiConfigured()) return Promise.resolve();
  queue.running ??= processQueue()
    .catch((error) => console.error("[ai-queue]", error))
    .finally(() => {
      queue.running = null;
    });
  return queue.running;
}

async function processQueue() {
  const startedAt = Date.now();
  // Reviews cut off mid-way start over
  await prisma.submission.updateMany({
    where: { aiStatus: "RUNNING", OR: [{ aiStartedAt: null }, { aiStartedAt: { lt: new Date(startedAt - STALE_RUNNING_MS) } }] },
    data: { aiStatus: "QUEUED" },
  });

  for (;;) {
    if (SERVERLESS && Date.now() - startedAt > SERVERLESS_START_WINDOW_MS) return;

    const next = await prisma.submission.findFirst({
      where: { aiStatus: "QUEUED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        aiAttempts: true,
        html: true,
        css: true,
        js: true,
        integrity: true,
        autotestResults: true,
        assignment: {
          select: {
            topic: true,
            tests: true,
            descriptionUz: true,
            descriptionRu: true,
            lesson: { select: { titleRu: true, titleUz: true } },
          },
        },
      },
    });
    if (!next) return;

    const claimed = await prisma.submission.updateMany({
      where: { id: next.id, aiStatus: "QUEUED" },
      data: { aiStatus: "RUNNING", aiStartedAt: new Date(), aiAttempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const rules = parseRules(next.assignment.tests);
    try {
      const report = await reviewSubmission({
        topic: next.assignment.topic,
        lessonTitle: next.assignment.lesson.titleRu || next.assignment.lesson.titleUz,
        description: { uz: next.assignment.descriptionUz, ru: next.assignment.descriptionRu },
        code: { html: next.html, css: next.css, js: next.js },
        rules,
        results: next.autotestResults ? parseResults(next.autotestResults, rules) : null,
        integrity: readSummary(next.integrity),
      });
      await prisma.submission.update({
        where: { id: next.id },
        data: { aiStatus: "DONE", aiReport: report as unknown as Prisma.InputJsonValue, aiError: null },
      });
    } catch (error) {
      const attempts = next.aiAttempts + 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : "AI review failed";

      if (error instanceof GeminiError && error.status === 429) {
        // Rate limit: not the submission's fault, don't count the attempt
        const wait = error.retryAfterMs ?? 60_000;
        await prisma.submission.update({
          where: { id: next.id },
          data: { aiStatus: "QUEUED", aiAttempts: next.aiAttempts, aiError: message },
        });
        if (wait > MAX_INLINE_WAIT_MS || SERVERLESS) return;
        await sleep(wait);
        continue;
      }

      const retryable = !(error instanceof GeminiError) || error.status === 0 || error.status >= 500;
      await prisma.submission.update({
        where: { id: next.id },
        data: {
          aiStatus: retryable && attempts < MAX_ATTEMPTS ? "QUEUED" : "FAILED",
          aiError: message,
        },
      });
      // A missing or invalid key won't fix itself
      if (error instanceof GeminiError && (error.status === 0 || error.status === 400 || error.status === 403)) return;
    }

    if (SERVERLESS) continue;
    await sleep(MIN_INTERVAL_MS);
  }
}
