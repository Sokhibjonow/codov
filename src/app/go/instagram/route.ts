import { prisma } from "@/lib/db";
import { CONTACTS } from "@/lib/site";

// The bot's Instagram button goes through here: Instagram can't tell anyone who follows whom,
// so the bot at least makes sure the person opened our page before it lets them in.
export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get("u") ?? "";
  if (/^\d{1,20}$/.test(u)) {
    await prisma.botUser.updateMany({ where: { telegramId: u, instagramAt: null }, data: { instagramAt: new Date() } }).catch(() => {});
  }
  return Response.redirect(CONTACTS.instagram, 302);
}
