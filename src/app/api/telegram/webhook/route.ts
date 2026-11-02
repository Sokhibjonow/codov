import { prisma } from "@/lib/db";
import { GIFTS, giftForSource, type Gift } from "@/lib/gifts";
import { SITE_URL } from "@/lib/site";
import { isSubscribed, keyboard, telegramConfigured, tg, webhookSecret } from "@/lib/telegram";

// The gift bot — the first stop after a video: the viewer presses Start (t.me/<bot>?start=<video>),
// gets the PDF promised in the video and, from the menu, the free lessons on the site, the channel and the
// online group. Every Start is kept as a BotUser with the video that brought them.

type TgUser = { id: number; first_name?: string; username?: string };
type Update = {
  message?: { chat: { id: number; type: string }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number } } };
};

const channelUrl = () => `https://t.me/${(process.env.TELEGRAM_CHANNEL || "@codovvv").replace(/^@/, "")}`;

// The menu that stays under the input field
const MENU = { gifts: "Sovg‘alar", lessons: "Bepul darslar", group: "Onlayn guruh", ask: "Savol berish" };
const menuKeyboard = {
  keyboard: [[{ text: MENU.gifts }, { text: MENU.lessons }], [{ text: MENU.group }, { text: MENU.ask }]],
  resize_keyboard: true,
  is_persistent: true,
};

const send = (chatId: number, text: string, reply_markup?: unknown) => tg("sendMessage", { chat_id: chatId, text, ...(reply_markup ? { reply_markup } : {}) });

/** The free lessons: pick a course, sign up on the site, the first lessons open at once. */
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
    keyboard([[{ text: "Ustozga yozish", url: "https://t.me/codov_admin" }], [{ text: "Telegram kanal", url: channelUrl() }]]),
  );
}

/** Sends the gifts (a bare /start from a Short gets all of them), then the way to the free lessons. */
async function sendGifts(chatId: number, gifts: Gift[]) {
  for (const g of gifts) await tg("sendDocument", { chat_id: chatId, document: `${SITE_URL}${g.href}`, caption: `${g.titleUz} — codov` });
  const gift = gifts[0];
  await send(
    chatId,
    "Keyingi qadam — amaliyot: codov platformasida 3 ta dars bepul. Kodni brauzerda yozasiz, AI darhol tekshiradi.",
    keyboard([
      [{ text: "3 ta bepul dars", url: `${SITE_URL}/register?kurs=${gift.kurs}` }],
      ...GIFTS.filter((g) => !gifts.includes(g)).map((g) => [{ text: `Yana sovg‘a: ${g.titleUz}`, callback_data: `gift:${g.key}` }]),
    ]),
  );
}

async function askToSubscribe(chatId: number, giftKey: string) {
  await send(
    chatId,
    "Sovg‘ani olish uchun kanalimizga obuna bo‘ling — u yerda har hafta bepul darslar va foydali materiallar.\n\nObuna bo‘lgach, «Obuna bo‘ldim» tugmasini bosing.",
    keyboard([[{ text: "Kanalga o‘tish", url: channelUrl() }], [{ text: "Obuna bo‘ldim", callback_data: `gift:${giftKey}` }]]),
  );
}

/** Gifts behind the (optional) channel subscription. */
async function giveGifts(chatId: number, userId: number, gifts: Gift[], key: string) {
  if (!(await isSubscribed(userId))) return askToSubscribe(chatId, key);
  await sendGifts(chatId, gifts);
  await prisma.botUser.updateMany({ where: { telegramId: String(userId) }, data: { giftSent: true, lastSeenAt: new Date() } });
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
      if (text.startsWith("/start")) {
        const source = text.slice(6).trim().replace(/[^\w-]/g, "");
        await remember(user, source);
        const gift = giftForSource(source);
        await send(
          chat,
          `Assalomu alaykum${user.first_name ? `, ${user.first_name}` : ""}! Bu — codov boti.\n\nBu yerda videolarda va’da qilingan bepul materiallarni olasiz va 3 ta darsni bepul sinab ko‘rasiz.`,
          menuKeyboard,
        );
        await giveGifts(chat, user.id, source ? [gift] : GIFTS, source ? gift.key : "all");
      } else if (text === MENU.gifts || text === "/sovgalar") {
        await giveGifts(chat, user.id, GIFTS, "all");
      } else if (text === MENU.lessons || text === "/darslar") {
        await sendLessons(chat);
      } else if (text === MENU.group || text === "/guruh") {
        await sendGroup(chat);
      } else {
        await send(chat, "Savolingizni ustozga yozing: @codov_admin — tez orada javob beradi.\n\nSovg‘alar va bepul darslar — pastdagi menyuda.", menuKeyboard);
      }
    }

    const cb = update.callback_query;
    if (cb?.data?.startsWith("gift:") && cb.message) {
      const key = cb.data.slice(5);
      const gifts = key === "all" ? GIFTS : [GIFTS.find((g) => g.key === key) ?? GIFTS[0]];
      if (await isSubscribed(cb.from.id)) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Rahmat!" });
        await giveGifts(cb.message.chat.id, cb.from.id, gifts, key);
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
