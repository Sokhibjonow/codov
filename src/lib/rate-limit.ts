// Simple in-memory limiter; enough for a single server instance.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const now = Date.now();

  if (attempts.size > 10_000) {
    for (const [k, entry] of attempts) if (entry.resetAt <= now) attempts.delete(k);
  }

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}
