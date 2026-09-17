import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { getSession } from "./session";
import { homePathFor, type Role } from "./session-token";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      login: true,
      role: true,
      firstName: true,
      lastName: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isActive || user.role !== session.role || user.sessionVersion !== session.sv) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(role: Role) {
  const user = await getCurrentUser();
  // The cookie may still be valid (e.g. account disabled, password reset) – clear it via the route handler
  if (!user) redirect("/logout");
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}
