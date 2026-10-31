import { prisma } from "@/lib/db";
import { GIFTS, giftForSource, type Gift } from "@/lib/gifts";
import { SITE_URL } from "@/lib/site";
import { isSubscribed, keyboard, telegramConfigured, tg } from "@/lib/telegram";

// The gift bot: a viewer presses Start (t.me/<bot>?start=<video>) and gets the PDF promised in the video,
// plus the way to the free lessons, the channel and the online group. Every Start is kept as a BotUser.

type TgUser = { id: number; first_name?: string; username?: string };
type Update = {
  message?: { chat: { id: number; type: string }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number } } };
};

const channelUrl = () => `https://t.me/${(process.env.TELEGRAM_CHANNEL || "@codovvv").replace(/^@/, "")}`;

/** Sends the gifts (a bare /start from a Short gets all of them), then the next steps. */
async function sendGift(chatId: number, gifts: Gift[], name: string) {
  const gift = gifts[0];
  await tg("sendMessage", { chat_id: chatId, text: `${name ? `${name}, ` : ""}mana videoda va’da qilingan sovg‘a:` });
  for (const g of gifts) await tg("sendDocument", { chat_id: chatId, document: `${SITE_URL}${g.href}`, caption: `${g.titleUz} — codov` });
  const other = GIFTS.find((g) => !gifts.includes(g));
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      "Keyingi qadam — amaliyot.\n\n" +
      "codov platformasida 3 ta dars bepul: kodni brauzerda yozasiz, avtotestlar va AI darhol tekshiradi.\n" +
      "Ustoz bilan o‘qishni xohlasangiz — onlayn guruh (6 kishigacha, o‘zbek va rus tilida).",
    reply_markup: keyboard([
      [{ text: "3 ta bepul dars", url: `${SITE_URL}/register?kurs=${gift.kurs}` }],
      [{ text: "Telegram kanal", url: channelUrl() }, { text: "Onlayn guruh", url: "https://t.me/codov_admin" }],
      ...(other ? [[{ text: `Yana sovg‘a: ${other.titleUz}`, callback_data: `gift:${other.key}` }]] : []),
    ]),
  });
}

async function askToSubscribe(chatId: number, giftKey: string) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "Sovg‘ani olish uchun kanalimizga obuna bo‘ling — u yerda har hafta bepul darslar va foydali materiallar.\n\nObuna bo‘lgach, «Obuna bo‘ldim» tugmasini bosing.",
    reply_markup: keyboard([[{ text: "Kanalga o‘tish", url: channelUrl() }], [{ text: "Obuna bo‘ldim", callback_data: `gift:${giftKey}` }]]),
  });
}

async function remember(user: TgUser, source: string) {
  const data = { username: user.username ?? null, firstName: (user.first_name ?? "").slice(0, 100), lastSeenAt: new Date() };
  await prisma.botUser.upsert({
    where: { telegramId: String(user.id) },
    create: { telegramId: String(user.id), source: source.slice(0, 64), ...data },
    update: { ...data, startCount: { increment: 1 } },
  });
}

export async function POST(request: Request) {
  if (!telegramConfigured() || request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;
  if (!update) return new Response("ok");

  try {
    const msg = update.message;
    if (msg?.from && msg.chat.type === "private") {
      const text = msg.text ?? "";
      if (text.startsWith("/start")) {
        const source = text.slice(6).trim().replace(/[^\w-]/g, "");
        await remember(msg.from, source);
        const gift = giftForSource(source);
        if (await isSubscribed(msg.from.id)) {
          await sendGift(msg.chat.id, source ? [gift] : GIFTS, msg.from.first_name ?? "");
          await prisma.botUser.update({ where: { telegramId: String(msg.from.id) }, data: { giftSent: true } });
        } else {
          await askToSubscribe(msg.chat.id, source ? gift.key : "all");
        }
      } else {
        await tg("sendMessage", {
          chat_id: msg.chat.id,
          text: "Savolingiz bo‘lsa, ustozga yozing: @codov_admin\nSovg‘alarni olish uchun /start ni bosing.",
          reply_markup: keyboard([[{ text: "3 ta bepul dars", url: `${SITE_URL}/register` }]]),
        });
      }
    }

    const cb = update.callback_query;
    if (cb?.data?.startsWith("gift:") && cb.message) {
      const key = cb.data.slice(5);
      const gifts = key === "all" ? GIFTS : [GIFTS.find((g) => g.key === key) ?? GIFTS[0]];
      if (await isSubscribed(cb.from.id)) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Rahmat!" });
        await sendGift(cb.message.chat.id, gifts, cb.from.first_name ?? "");
        await prisma.botUser.updateMany({ where: { telegramId: String(cb.from.id) }, data: { giftSent: true, lastSeenAt: new Date() } });
      } else {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Hali obuna bo‘lmagansiz. Avval kanalga obuna bo‘ling.", show_alert: true });
      }
    }
  } catch (error) {
    // Telegram retries failed updates: answer 200 anyway so one bad update can't jam the queue
    console.error("[telegram-webhook]", error);
  }
  return new Response("ok");
}
