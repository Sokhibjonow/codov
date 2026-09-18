import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "./db";

type Db = PrismaClient | Prisma.TransactionClient;

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

function latinPart(text: string) {
  return [...text.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

/** "Ali", "Valiyev" → "ali.valiyev"; "Алишер" → "alisher" */
export function loginBase(firstName: string, lastName: string) {
  const base = [latinPart(firstName), latinPart(lastName)].filter(Boolean).join(".").slice(0, 24);
  return base.length >= 3 ? base : `user${base}`;
}

/** Finds a free login: base, base2, base3… `reserved` holds logins already taken in this batch. */
export async function pickUniqueLogin(base: string, reserved: Set<string> = new Set(), db: Db = prisma) {
  const existing = await db.user.findMany({
    where: { login: { startsWith: base } },
    select: { login: true },
  });
  const taken = new Set(existing.map((u) => u.login));

  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base}${i}`;
    if (!taken.has(candidate) && !reserved.has(candidate)) {
      reserved.add(candidate);
      return candidate;
    }
  }
}

/** Stores Uzbek numbers as +998XXXXXXXXX; anything else is kept as typed (digits and +). */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return input.trim().startsWith("+") ? `+${digits}` : digits;
}

export { formatPhone } from "./phone";

/** Every word of the query must match the name, login or phone ("Valiyev Ali" works). */
export function userSearchWhere(query: string): Prisma.UserWhereInput {
  const words = query.split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { login: { contains: word.toLowerCase() } },
        { phone: { contains: word.replace(/\D/g, "") || word } },
      ],
    })),
  };
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.lastName} ${user.firstName}`.trim();
}
