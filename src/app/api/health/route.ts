import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Used by the server to check that the site and the database are alive. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
