// Telegram Bot API: the bot that hands out the gifts from the videos.
// Env: TELEGRAM_BOT_TOKEN (from @BotFather), TELEGRAM_WEBHOOK_SECRET (any long random string, also given to
// setWebhook as secret_token), TELEGRAM_CHANNEL (optional, e.g. "@codovvv": the gift waits for a subscription;
// the bot must be an administrator of that channel to see its members).

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);
}

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null;
  if (!data?.ok) {
    console.error("[telegram]", method, data?.description ?? res.status);
    return null;
  }
  return data.result ?? null;
}

export type InlineButton = { text: string; url: string } | { text: string; callback_data: string };
export const keyboard = (rows: InlineButton[][]) => ({ inline_keyboard: rows });

/** Is the user subscribed to the channel? True when no channel is configured or the check is impossible. */
export async function isSubscribed(userId: number) {
  const channel = process.env.TELEGRAM_CHANNEL;
  if (!channel) return true;
  const member = await tg<{ status: string }>("getChatMember", { chat_id: channel, user_id: userId });
  // the bot is not an admin of the channel (or Telegram is down): never lock the gift away
  if (!member) return true;
  return ["creator", "administrator", "member", "restricted"].includes(member.status);
}
