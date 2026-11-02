import { prisma } from "@/lib/db";
import { GIFTS, giftForSource, type Gift } from "@/lib/gifts";
import { CONTACTS, SITE_URL } from "@/lib/site";
import { CHANNEL, isSubscribed, keyboard, telegramConfigured, tg, webhookSecret } from "@/lib/telegram";

// The gift bot — the first stop after a video. It works only for subscribers of the Telegram channel
// (checked with Telegram). Then: the PDF promised in the video and a menu with the free lessons on the site,
// the online group and questions. Every Start is kept as a BotUser with the video that brought them.

type TgUser = { id: number; first_name?: string; username?: string };
type Update = {
  message?: { chat: { id: number; type: string }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number } } };
};

const channelUrl = `https://t.me/${CHANNEL.replace(/^@/, "")}`;

// The menu that stays under the input field
const MENU = { gifts: "Sovg‘alar", lessons: "Bepul darslar", group: "Onlayn guruh", ask: "Savol berish" };
const menuKeyboard = {
  keyboard: [[{ text: MENU.gifts }, { text: MENU.lessons }], [{ text: MENU.group }, { text: MENU.ask }]],
  resize_keyboard: true,
  is_persistent: true,
};

const send = (chatId: number, text: string, reply_markup?: unknown) => tg("sendMessage", { chat_id: chatId, text, ...(reply_markup ? { reply_markup } : {}) });

// ── the gate: nothing works without a subscription to the channel ──
/** "Subscribe first": the channel button and a check that remembers what the person came for. */
async function askToFollow(chatId: number, then: string) {
  await send(
    chatId,
    `Botdan foydalanish uchun Telegram kanalimizga obuna bo‘ling: ${CHANNEL}\n\nObuna bo‘lgach, «Tekshirish» tugmasini bosing.`,
    keyboard([[{ text: "Kanalga obuna bo‘lish", url: channelUrl }], [{ text: "Tekshirish", callback_data: `check:${then}` }]]),
  );
}

// ── what the bot gives ──
async function sendLessons(chatId: number) {
  await send(
    chatId,
    "3 ta dars bepul — to‘lovsiz va kartasiz.\n\nKodni to‘g‘ridan-to‘g‘ri brauzerda yozasiz, avtotestlar va AI ishingizni darhol tekshiradi. Kursni tanlang:",
    keyboard([
      [{ text: "HTML va CSS — noldan (START)", url: `${SITE_URL}/register?kurs=start` }],
      [{ text: "JavaScript", url: `${SITE_URL}/register?kurs=js` }],
      [{ text: "Akkauntim bor — kirish", url: `${SITE_URL}/login` }],
    ]),
  );
}

async function sendGroup(chatId: number) {
  await send(
    chatId,
    "Ustoz bilan onlayn guruh:\n• 6 kishigacha — ustoz har biriga vaqt ajratadi\n• o‘zbek va rus tilida\n• har bir ishingizni ustoz tekshiradi, ota-onalar natijani ko‘radi\n\nJoylar va boshlanish sanasini bilish uchun yozing:",
    keyboard([[{ text: "Ustozga yozish", url: `https://t.me/${CONTACTS.telegram}` }]]),
  );
}

/** The gifts (a bare /start from a Short gets all of them), then the way to the free lessons. */
async function sendGifts(chatId: number, userId: number, gifts: Gift[]) {
  for (const g of gifts) await tg("sendDocument", { chat_id: chatId, document: `${SITE_URL}${g.href}`, caption: `${g.titleUz} — codov` });
  await send(
    chatId,
    "Keyingi qadam — amaliyot: codov platformasida 3 ta dars bepul. Kodni brauzerda yozasiz, AI darhol tekshiradi.",
    keyboard([
      [{ text: "3 ta bepul dars", url: `${SITE_URL}/register?kurs=${gifts[0].kurs}` }],
      ...GIFTS.filter((g) => !gifts.includes(g)).map((g) => [{ text: `Yana sovg‘a: ${g.titleUz}`, callback_data: `do:gift-${g.key}` }]),
    ]),
  );
  await prisma.botUser.updateMany({ where: { telegramId: String(userId) }, data: { giftSent: true, lastSeenAt: new Date() } });
}

/**
 * What the person asked for, once they follow us. `what`: "start:<video>" (the gift of that video),
 * "gifts", "gift-<key>", "lessons", "group".
 */
async function deliver(chatId: number, user: TgUser, what: string) {
  if (what.startsWith("start:")) {
    const source = what.slice(6);
    await send(chatId, `Rahmat${user.first_name ? `, ${user.first_name}` : ""}! Mana videoda va’da qilingan sovg‘a. Pastdagi menyuda — bepul darslar va onlayn guruh.`, menuKeyboard);
    return sendGifts(chatId, user.id, source ? [giftForSource(source)] : GIFTS);
  }
  if (what === "gifts") return sendGifts(chatId, user.id, GIFTS);
  if (what.startsWith("gift-")) return sendGifts(chatId, user.id, [GIFTS.find((g) => g.key === what.slice(5)) ?? GIFTS[0]]);
  if (what === "lessons") return sendLessons(chatId);
  if (what === "group") return sendGroup(chatId);
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
  if (!telegramConfigured() || request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;
  if (!update) return new Response("ok");

  try {
    const msg = update.message;
    if (msg?.from && msg.chat.type === "private") {
      const chat = msg.chat.id, user = msg.from;
      const text = (msg.text ?? "").trim();
      let what: string | null = null;
      if (text.startsWith("/start")) {
        const source = text.slice(6).trim().replace(/[^\w-]/g, "");
        await remember(user, source);
        await send(chat, `Assalomu alaykum${user.first_name ? `, ${user.first_name}` : ""}! Bu — codov boti: videolarda va’da qilingan bepul materiallar va 3 ta bepul dars.`);
        what = `start:${source}`;
      } else if (text === MENU.gifts || text === "/sovgalar") what = "gifts";
      else if (text === MENU.lessons || text === "/darslar") what = "lessons";
      else if (text === MENU.group || text === "/guruh") what = "group";

      if (!what) {
        await send(chat, `Savolingizni ustozga yozing: @${CONTACTS.telegram} — tez orada javob beradi.\n\nSovg‘alar va bepul darslar — pastdagi menyuda.`, menuKeyboard);
      } else {
        // nothing works without a subscription
        if (await isSubscribed(user.id)) await deliver(chat, user, what);
        else await askToFollow(chat, what);
      }
    }

    const cb = update.callback_query;
    if (cb?.data && cb.message) {
      const chat = cb.message.chat.id;
      if (cb.data.startsWith("check:") || cb.data.startsWith("do:")) {
        const what = cb.data.replace(/^(check|do):/, "");
        if (!(await isSubscribed(cb.from.id))) {
          await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `Kanalimizga (${CHANNEL}) hali obuna bo‘lmagansiz.`, show_alert: true });
          if (cb.data.startsWith("do:")) await askToFollow(chat, what);
        } else {
          await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Rahmat! Obuna tasdiqlandi." });
          await deliver(chat, cb.from, what);
        }
      }
    }
  } catch (error) {
    // Telegram retries failed updates: answer 200 anyway so one bad update can't jam the queue
    console.error("[telegram-webhook]", error);
  }
  return new Response("ok");
}
