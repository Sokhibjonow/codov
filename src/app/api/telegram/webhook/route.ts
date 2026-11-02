import { prisma } from "@/lib/db";
import { GIFTS, giftForSource } from "@/lib/gifts";
import { CONTACTS, SITE_URL } from "@/lib/site";
import { CHANNEL, isSubscribed, keyboard, telegramConfigured, tg, webhookSecret } from "@/lib/telegram";

// The gift bot — the first stop after a video. It works only for subscribers of the Telegram channel
// (checked with Telegram on every action). After the check it shows a menu of sections; the person picks
// what they want: the materials (PDFs, the one promised in their video first), the free lessons on the site,
// videos, the online group, the courses, our pages, an invite link for friends and questions.
// Every Start is kept as a BotUser with the video (or friend: "ref-<id>") that brought them.

type TgUser = { id: number; first_name?: string; username?: string };
type Update = {
  message?: { chat: { id: number; type: string }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number } } };
};

const BOT_LINK = "https://t.me/Codov_uz_bot";
const YOUTUBE = "https://www.youtube.com/@codovv";
const channelUrl = `https://t.me/${CHANNEL.replace(/^@/, "")}`;
const adminUrl = `https://t.me/${CONTACTS.telegram}`;

// ── the menu under the input field: label → section ──
const MENU: [label: string, section: string][] = [
  ["📚 Materiallar", "materials"],
  ["🎓 Bepul darslar", "lessons"],
  ["▶️ Video darslar", "videos"],
  ["👨‍🏫 Onlayn guruh", "group"],
  ["📋 Kurslar haqida", "courses"],
  ["🌐 Ijtimoiy tarmoqlar", "social"],
  ["🎁 Do‘stga ulashish", "share"],
  ["❓ Savol berish", "ask"],
];
// commands and the labels of the first version of the menu still work
const ALIASES: Record<string, string> = {
  "/materiallar": "materials", "/sovgalar": "materials", "Sovg‘alar": "materials",
  "/darslar": "lessons", "Bepul darslar": "lessons",
  "/guruh": "group", "Onlayn guruh": "group",
  "/kurslar": "courses", "/video": "videos", "/savol": "ask", "Savol berish": "ask",
};
const sectionOf = (text: string) => MENU.find(([label]) => label === text)?.[1] ?? ALIASES[text] ?? null;
const menuKeyboard = {
  keyboard: [0, 2, 4, 6].map((i) => [{ text: MENU[i][0] }, { text: MENU[i + 1][0] }]),
  resize_keyboard: true,
  is_persistent: true,
};

// messages are HTML: names typed by people must not break the markup
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hi = (user: TgUser) => (user.first_name ? `, ${esc(user.first_name)}` : "");

const send = (chatId: number, text: string, reply_markup?: unknown) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });
const lessonsButton = (kurs = "") => [{ text: "🎓 3 ta bepul dars", url: `${SITE_URL}/register${kurs ? `?kurs=${kurs}` : ""}` }];

// ── the gate: nothing works without a subscription to the channel ──
/** "Subscribe first": the channel button and a check that remembers what the person came for. */
async function askToFollow(chatId: number, then: string) {
  await send(
    chatId,
    `Botdan foydalanish uchun Telegram kanalimizga obuna bo‘ling: ${CHANNEL}\n\nObuna bo‘lgach, «Tekshirish» tugmasini bosing.`,
    keyboard([[{ text: "📢 Kanalga obuna bo‘lish", url: channelUrl }], [{ text: "✅ Tekshirish", callback_data: `check:${then}` }]]),
  );
}

// ── sections ──
/** The materials: one button per PDF; the one promised in the person's video goes first. */
async function sendMaterials(chatId: number, source = "") {
  const promised = source ? giftForSource(source) : null;
  const list = promised ? [promised, ...GIFTS.filter((g) => g !== promised)] : GIFTS;
  await send(
    chatId,
    `<b>📚 Bepul materiallar</b>\n\nKeraklisini tanlang — fayl darhol keladi:${promised ? "\n\n⭐ — videoda va’da qilingan sovg‘a" : ""}`,
    keyboard(list.map((g) => [{ text: `${g === promised ? "⭐ " : "📄 "}${g.titleUz}`, callback_data: `do:gift-${g.key}` }])),
  );
}

async function sendGift(chatId: number, userId: number, key: string) {
  const gift = GIFTS.find((g) => g.key === key) ?? GIFTS[0];
  await tg("sendDocument", { chat_id: chatId, document: `${SITE_URL}${gift.href}`, caption: `${gift.titleUz} — codov` });
  await send(
    chatId,
    "Endi amaliyot: codov platformasida <b>3 ta dars bepul</b> — kodni brauzerda yozasiz, AI darhol tekshiradi.\n\nBoshqa materiallar — «📚 Materiallar» bo‘limida.",
    keyboard([lessonsButton(gift.kurs)]),
  );
  await prisma.botUser.updateMany({ where: { telegramId: String(userId) }, data: { giftSent: true, lastSeenAt: new Date() } });
}

const SECTIONS: Record<string, (chatId: number, user: TgUser) => Promise<unknown>> = {
  materials: (chat) => sendMaterials(chat),
  lessons: (chat) =>
    send(
      chat,
      "<b>🎓 3 ta dars bepul</b> — to‘lovsiz va kartasiz.\n\nKodni to‘g‘ridan-to‘g‘ri brauzerda yozasiz, avtotestlar va AI ishingizni darhol tekshiradi. Kursni tanlang:",
      keyboard([
        [{ text: "🧱 HTML va CSS — noldan (START)", url: `${SITE_URL}/register?kurs=start` }],
        [{ text: "⚡ JavaScript", url: `${SITE_URL}/register?kurs=js` }],
        [{ text: "🔑 Akkauntim bor — kirish", url: `${SITE_URL}/login` }],
      ]),
    ),
  videos: (chat) =>
    send(
      chat,
      "<b>▶️ Video darslar</b>\n\nYouTube kanalimizda — o‘zbek tilida bepul darslar: tushuntirish, jonli kod va amaliy loyiha. Har hafta yangi dars.",
      keyboard([
        [{ text: "▶️ YouTube kanal", url: YOUTUBE }],
        [{ text: "JavaScript · 1-dars: Birinchi dastur", url: "https://youtu.be/CEs0oWPfU_E" }],
      ]),
    ),
  group: (chat) =>
    send(
      chat,
      "<b>👨‍🏫 Ustoz bilan onlayn guruh</b>\n\n• 6 kishigacha — ustoz har biriga vaqt ajratadi\n• o‘zbek va rus tilida\n• har bir ishingizni ustoz tekshiradi\n• ota-onalar natijani ko‘radi\n\nJoylar va boshlanish sanasini bilish uchun yozing:",
      keyboard([[{ text: "✍️ Ustozga yozish", url: adminUrl }]]),
    ),
  courses: (chat) =>
    send(
      chat,
      "<b>📋 Kurslarimiz</b>\n\n" +
        "<b>🧱 START — dasturlashni noldan</b>\nHTML, CSS, JavaScript, Git va saytni internetga joylash. 48 dars.\n\n" +
        "<b>⚡ JavaScript</b>\nSahifani jonlantiramiz: o‘zgaruvchilar, funksiyalar, hodisalar, massivlar, obyektlar, localStorage, fetch. 30 dars, har darsda loyiha.\n\n" +
        "O‘qish usuli: ustoz bilan onlayn guruhda yoki platformada o‘z sur’atingizda — har bir ishni ustoz tekshiradi.",
      keyboard([
        [{ text: "🧱 START — 3 ta bepul dars", url: `${SITE_URL}/register?kurs=start` }],
        [{ text: "⚡ JavaScript — 3 ta bepul dars", url: `${SITE_URL}/register?kurs=js` }],
        [{ text: "🌐 Sayt: codov.uz", url: SITE_URL }],
      ]),
    ),
  social: (chat) =>
    send(
      chat,
      "<b>🌐 Bizni kuzatib boring</b>",
      keyboard([
        [{ text: "📢 Telegram kanal", url: channelUrl }, { text: "📸 Instagram", url: CONTACTS.instagram }],
        [{ text: "▶️ YouTube", url: YOUTUBE }, { text: "🌐 codov.uz", url: SITE_URL }],
      ]),
    ),
  share: (chat, user) => {
    const link = `${BOT_LINK}?start=ref-${user.id}`;
    const text = "Dasturlashni noldan o‘rganish: bepul materiallar va 3 ta bepul dars — codov botida";
    return send(
      chat,
      `<b>🎁 Do‘stlaringizga yuboring</b>\n\nUlar ham bepul materiallar va 3 ta bepul dars oladi. Sizning havolangiz:\n${link}`,
      keyboard([[{ text: "📤 Ulashish", url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` }]]),
    );
  },
  ask: (chat) =>
    send(chat, `<b>❓ Savolingiz bormi?</b>\n\nUstozga yozing — tez orada javob beradi.`, keyboard([[{ text: "✍️ Ustozga yozish", url: adminUrl }]])),
};

/** What the person asked for, once they are subscribed. `what`: "start:<video>", "gift-<key>" or a section. */
async function deliver(chatId: number, user: TgUser, what: string) {
  if (what.startsWith("start:")) {
    await send(chatId, `✅ Rahmat${hi(user)}! Pastdagi menyudan kerakli bo‘limni tanlang 👇`, menuKeyboard);
    return sendMaterials(chatId, what.slice(6));
  }
  if (what.startsWith("gift-")) return sendGift(chatId, user.id, what.slice(5));
  return SECTIONS[what]?.(chatId, user);
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
        await send(chat, `Assalomu alaykum${hi(user)}! 👋\n\nBu — <b>codov</b> boti: dasturlashni noldan o‘rganish uchun bepul materiallar, video darslar va 3 ta bepul dars.`);
        what = `start:${source}`;
      } else {
        what = sectionOf(text);
      }

      if (!what) {
        await send(chat, "Pastdagi menyudan bo‘limni tanlang 👇\n\nSavolingiz bo‘lsa — «❓ Savol berish».", menuKeyboard);
      } else if (await isSubscribed(user.id)) {
        await deliver(chat, user, what);
      } else {
        // nothing works without a subscription
        await askToFollow(chat, what);
      }
    }

    const cb = update.callback_query;
    if (cb?.data && cb.message && (cb.data.startsWith("check:") || cb.data.startsWith("do:"))) {
      const chat = cb.message.chat.id;
      const what = cb.data.replace(/^(check|do):/, "");
      if (!(await isSubscribed(cb.from.id))) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `Kanalimizga (${CHANNEL}) hali obuna bo‘lmagansiz.`, show_alert: true });
        if (cb.data.startsWith("do:")) await askToFollow(chat, what);
      } else {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: cb.data.startsWith("check:") ? "Rahmat! Obuna tasdiqlandi." : "" });
        await deliver(chat, cb.from, what);
      }
    }
  } catch (error) {
    // Telegram retries failed updates: answer 200 anyway so one bad update can't jam the queue
    console.error("[telegram-webhook]", error);
  }
  return new Response("ok");
}
