import type { Locale } from "@/i18n/config";

const intlLocale: Record<Locale, string> = { uz: "uz-Latn-UZ", ru: "ru-RU" };

// Uzbekistan is UTC+5 all year (no daylight saving)
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Date → value for <input type="datetime-local"> in Tashkent time */
export function toTashkentInput(date: Date) {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-09-20T18:00" typed in Tashkent time → Date */
export function fromTashkentInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ───────────── Calendar dates (attendance) ─────────────
// Stored in @db.Date columns as UTC midnight of the Tashkent calendar day.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string) {
  return DATE_PATTERN.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/** Today's date in Tashkent as "YYYY-MM-DD" */
export function tashkentToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function toDbDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function fromDbDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Many browsers (and some phones) ship without Uzbek date data and print "M09 15",
// so Uzbek dates are spelled out by hand.
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const UZ_WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

type DayOptions = Pick<Intl.DateTimeFormatOptions, "weekday" | "day" | "month" | "year">;

function formatUzDay(date: Date, options: DayOptions) {
  const month = UZ_MONTHS[date.getUTCMonth()];
  const monthText = options.month === "short" ? month.slice(0, 3) : month;
  let text = options.day
    ? `${date.getUTCDate()}-${options.month ? monthText : ""}`.replace(/-$/, "")
    : options.month
      ? monthText
      : "";
  if (options.year) text = options.day ? `${text} ${date.getUTCFullYear()}-yil` : `${date.getUTCFullYear()}-yil ${text}`;
  if (options.weekday) {
    const weekday = (options.weekday === "long" ? UZ_WEEKDAYS : UZ_WEEKDAYS_SHORT)[date.getUTCDay()];
    text = `${text}, ${weekday}`;
  }
  return text.trim();
}

/** A calendar day ("YYYY-MM-DD") as text */
export function formatDay(day: string, locale: Locale, options: DayOptions = { weekday: "short", day: "numeric", month: "long" }) {
  if (locale === "uz") return formatUzDay(toDbDate(day), options);
  return new Intl.DateTimeFormat(intlLocale[locale], { ...options, timeZone: "UTC" }).format(toDbDate(day));
}

/** Day and month of a moment in Tashkent time: "15-sentabr" / "15 сентября" */
export function formatDayMonth(date: Date, locale: Locale) {
  return formatDay(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(date), locale, { day: "numeric", month: "long" });
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

/** "5 min ago", "yesterday"… */
export function formatRelative(iso: string, locale: Locale) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 7 * 86_400) {
    const [value, unit] =
      seconds < 60 ? [0, "now"] : seconds < 3600 ? [Math.floor(seconds / 60), "min"] : seconds < 86_400 ? [Math.floor(seconds / 3600), "hour"] : [Math.floor(seconds / 86_400), "day"];
    if (unit === "now") return locale === "uz" ? "hozirgina" : "только что";
    if (locale === "uz") return unit === "day" && value === 1 ? "kecha" : `${value} ${unit === "min" ? "daqiqa" : unit === "hour" ? "soat" : "kun"} oldin`;
    if (unit === "day" && value === 1) return "вчера";
    return `${value} ${unit === "min" ? "мин" : unit === "hour" ? "ч" : plural(value, "день", "дня", "дней")} назад`;
  }
  return formatDateTime(new Date(iso), locale);
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function isPast(date: Date) {
  return date.getTime() < Date.now();
}

export function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uz" ? "ru-RU" : intlLocale[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(date);
}
