// Free materials promised in the videos (lead magnets). Students of a course find its gift in their cabinet,
// everyone gets all of them from the Telegram bot. The files live in public/sovga: no upload or admin step.
type GiftDef = {
  key: string;
  /** Course (Uzbek title) whose students see this gift in the cabinet; general gifts have none */
  course?: string;
  titleUz: string;
  titleRu: string;
  href: string;
  /** The course a bot user is invited to try for free (/register?kurs=…) */
  kurs: "js" | "start";
  /** Deep-link tags (t.me/<bot>?start=<tag>…) of the videos that promise this gift */
  tags: string[];
};

export const GIFTS: GiftDef[] = [
  {
    key: "js",
    course: "JavaScript",
    titleUz: "JavaScript shpargalka (PDF)",
    titleRu: "Шпаргалка по JavaScript (PDF)",
    href: "/sovga/codov-javascript-shpargalka.pdf",
    kurs: "js",
    tags: ["js", "viral"],
  },
  {
    key: "reja",
    course: "START · Asoslar",
    titleUz: "Dasturlashni noldan: 30 kunlik reja (PDF)",
    titleRu: "Программирование с нуля: план на 30 дней (PDF)",
    href: "/sovga/codov-30-kunlik-reja.pdf",
    kurs: "start",
    tags: ["eniac", "rasm", "skrinshot", "dars-01"],
  },
  {
    key: "xavfsizlik",
    titleUz: "Internetda xavfsizlik: 10 qoida (PDF)",
    titleRu: "Безопасность в интернете: 10 правил (PDF)",
    href: "/sovga/codov-internet-xavfsizlik.pdf",
    kurs: "start",
    tags: ["sms"],
  },
  {
    key: "bola",
    titleUz: "Farzandingiz va telefon: 7 qoida (PDF)",
    titleRu: "Ребёнок и телефон: 7 правил (PDF)",
    href: "/sovga/codov-farzand-va-telefon.pdf",
    kurs: "start",
    tags: ["telefon"],
  },
  {
    key: "yol",
    titleUz: "Farzandingiz uchun IT yo‘l xaritasi (PDF)",
    titleRu: "IT-дорожная карта для вашего ребёнка (PDF)",
    href: "/sovga/codov-it-yol-xaritasi.pdf",
    kurs: "start",
    tags: ["kasb"],
  },
];

export type Gift = GiftDef;

/** Gifts for the courses with these Uzbek titles. */
export function giftsFor(courseTitlesUz: string[]) {
  const titles = new Set(courseTitlesUz.map((t) => t.trim().toLowerCase()));
  return GIFTS.filter((g) => g.course && titles.has(g.course.toLowerCase()));
}

/**
 * The gift promised by the video in a bot deep link (t.me/bot?start=<tag>): matched by the tag's start,
 * so "js-02" and "viral-01" both mean the JavaScript cheat sheet. Unknown tags get the 30-day plan.
 */
export function giftForSource(source: string) {
  const s = source.toLowerCase();
  return GIFTS.find((g) => g.tags.some((tag) => s.startsWith(tag))) ?? GIFTS.find((g) => g.key === "reja")!;
}
