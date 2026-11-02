import { createHash } from "node:crypto";
import { SITE_URL } from "./site";

// Telegram Bot API: the bot that hands out the gifts from the videos and leads people to the free lessons.
// Env: TELEGRAM_BOT_TOKEN (from @BotFather) is all that is required. Optional: TELEGRAM_WEBHOOK_SECRET
// (otherwise derived from the token) and TELEGRAM_CHANNEL (default "@codovvv"). The bot works only for
// subscribers of that channel; to see its members the bot must be an administrator of the channel.

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** The secret Telegram sends with every update, so nobody else can post to the webhook. */
export function webhookSecret() {
  const explicit = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (explicit) return explicit;
  return createHash("sha256").update(`codov-webhook:${process.env.TELEGRAM_BOT_TOKEN ?? ""}`).digest("hex").slice(0, 48);
}

export const WEBHOOK_URL = `${SITE_URL}/api/telegram/webhook`;

export async function tg<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null;
  if (!data?.ok) {
    console.error("[telegram]", method, data?.description ?? res?.status ?? "network error");
    return null;
  }
  return data.result ?? null;
}

export type InlineButton = { text: string; url: string } | { text: string; callback_data: string };
export const keyboard = (rows: InlineButton[][]) => ({ inline_keyboard: rows });

export const CHANNEL = process.env.TELEGRAM_CHANNEL || "@codovvv";

/** Is the user subscribed to the channel? True when the check is impossible (the bot is not a channel admin). */
export async function isSubscribed(userId: number) {
  const channel = CHANNEL;
  const member = await tg<{ status: string }>("getChatMember", { chat_id: channel, user_id: userId });
  // the bot is not an admin of the channel (or Telegram is down): never lock the gift away
  if (!member) return true;
  return ["creator", "administrator", "member", "restricted"].includes(member.status);
}

/** The bot as Telegram sees it, and whether its webhook points at this site. */
export async function botStatus() {
  if (!telegramConfigured()) return null;
  const [me, hook] = await Promise.all([
    tg<{ id: number; username: string; first_name: string }>("getMe"),
    tg<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo"),
  ]);
  if (!me) return { ok: false as const };
  // the subscription check only works when the bot is an administrator of the channel
  const self = await tg<{ status: string }>("getChatMember", { chat_id: CHANNEL, user_id: me.id });
  return {
    ok: true as const,
    username: me.username,
    connected: hook?.url === WEBHOOK_URL,
    lastError: hook?.last_error_message,
    channel: CHANNEL,
    channelAdmin: self?.status === "administrator" || self?.status === "creator",
  };
}

/** One-click setup: webhook, command menu and the texts people see before pressing Start. */
export async function connectBot() {
  const hook = await tg<boolean>("setWebhook", {
    url: WEBHOOK_URL,
    secret_token: webhookSecret(),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  if (!hook) return false;
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Sovg‘alar va bepul darslar" },
      { command: "sovgalar", description: "Bepul materiallar (PDF)" },
      { command: "darslar", description: "3 ta bepul dars" },
      { command: "guruh", description: "Ustoz bilan onlayn guruh" },
    ],
  });
  await tg("setMyDescription", {
    description:
      "codov — veb-dasturlashni noldan o‘rganish, o‘zbek va rus tilida.\n\n" +
      "Start ni bosing va bepul oling:\n• JavaScript shpargalka (PDF)\n• Dasturlashni noldan: 30 kunlik reja (PDF)\n• 3 ta bepul dars — kodni brauzerda yozasiz, AI darhol tekshiradi",
  });
  await tg("setMyShortDescription", { short_description: "Dasturlashni noldan: bepul materiallar va 3 ta bepul dars. codov.uz" });
  return true;
}
