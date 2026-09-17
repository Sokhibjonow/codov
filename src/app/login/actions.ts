"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createSession, deleteSession } from "@/lib/session";
import { homePathFor } from "@/lib/session-token";

export type LoginState =
  | { error: "required" | "invalid" | "blocked" | "tooMany"; login: string }
  | undefined;

const credentialsSchema = z.object({
  login: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(200),
});

// Compared against when the login does not exist, so response time doesn't reveal valid logins
const DUMMY_HASH = bcrypt.hashSync("codov-dummy-password", 10);

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawLogin = String(formData.get("login") ?? "");
  const parsed = credentialsSchema.safeParse({
    login: rawLogin,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "required", login: rawLogin };

  const { login, password } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limitKey = `${ip}:${login}`;
  if (!checkRateLimit(limitKey)) return { error: "tooMany", login };

  const user = await prisma.user.findUnique({ where: { login } });
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) return { error: "invalid", login };
  if (!user.isActive) return { error: "blocked", login };

  resetRateLimit(limitKey);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({
    userId: user.id,
    role: user.role,
    sv: user.sessionVersion,
    remember: formData.get("remember") === "on",
  });
  redirect(homePathFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
