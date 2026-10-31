// Free materials promised in the videos (lead magnets). Students of the course find them in their cabinet,
// everyone else gets them from the Telegram bot. The files live in public/sovga: no upload or admin step.
export const GIFTS = [
  {
    key: "js",
    course: "JavaScript",
    titleUz: "JavaScript shpargalka (PDF)",
    titleRu: "Шпаргалка по JavaScript (PDF)",
    href: "/sovga/codov-javascript-shpargalka.pdf",
    // the course a bot user is invited to try for free (/register?kurs=…)
    kurs: "js",
  },
  {
    key: "reja",
    course: "START · Asoslar",
    titleUz: "Dasturlashni noldan: 30 kunlik reja (PDF)",
    titleRu: "Программирование с нуля: план на 30 дней (PDF)",
    href: "/sovga/codov-30-kunlik-reja.pdf",
    kurs: "start",
  },
];

export type Gift = (typeof GIFTS)[number];

/** Gifts for the courses with these Uzbek titles. */
export function giftsFor(courseTitlesUz: string[]) {
  const titles = new Set(courseTitlesUz.map((t) => t.trim().toLowerCase()));
  return GIFTS.filter((g) => titles.has(g.course.toLowerCase()));
}

/**
 * The gift for a bot deep link (t.me/bot?start=<source>): JavaScript videos and Shorts send "js…" or "viral…",
 * everything else (general Shorts, ads, a bare /start) gets the 30-day plan.
 */
export function giftForSource(source: string) {
  const s = source.toLowerCase();
  return GIFTS.find((g) => g.key === (s.startsWith("js") || s.startsWith("viral") ? "js" : "reja"))!;
}
