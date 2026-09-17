// Minimal Google Gemini client (REST generateContent with JSON output).

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** From the API's RetryInfo when the rate limit is hit */
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Models to try in order (GEMINI_MODEL may list several, comma-separated).
 * Fast "lite" models suit short code reviews and stay within the free tier.
 */
export function geminiModels() {
  const configured = process.env.GEMINI_MODEL?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];
  return configured.length ? configured : ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.6-flash"];
}

function retryDelayMs(body: unknown) {
  const details = (body as { error?: { details?: { "@type"?: string; retryDelay?: string }[] } })?.error?.details ?? [];
  const delay = details.find((d) => d["@type"]?.endsWith("RetryInfo"))?.retryDelay;
  const seconds = delay ? Number.parseFloat(delay) : Number.NaN;
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : undefined;
}

async function callModel(model: string, apiKey: string, options: { system: string; user: string; schema: object; temperature?: number }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.user }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        responseMimeType: "application/json",
        responseSchema: options.schema,
      },
    }),
    // Vercel functions stop after 60 s, so each model gets less time there
    signal: AbortSignal.timeout(process.env.VERCEL ? 15_000 : 120_000),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { error?: { message?: string } })?.error?.message ?? response.statusText;
    throw new GeminiError(`${model} ${response.status}: ${message}`.slice(0, 500), response.status, retryDelayMs(body));
  }

  const candidate = (body as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] })?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GeminiError(`${model}: empty response (${candidate?.finishReason ?? "no candidates"})`, 500);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiError(`${model}: response is not valid JSON`, 500);
  }
}

/** Tries the models in order; moves on when a model is overloaded (503), gone (404) or times out. */
export async function generateJson(options: { system: string; user: string; schema: object; temperature?: number }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set", 0);

  let lastError: unknown;
  for (const model of geminiModels()) {
    try {
      return { data: await callModel(model, apiKey, options), model };
    } catch (error) {
      lastError = error;
      const switchModel =
        (error instanceof GeminiError && (error.status === 404 || error.status === 503)) ||
        (error instanceof Error && error.name === "TimeoutError");
      if (!switchModel) throw error;
    }
  }
  throw lastError;
}
