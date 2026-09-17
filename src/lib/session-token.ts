import { jwtVerify, SignJWT } from "jose";

// Kept free of next/headers so it can be used from proxy.ts as well as the server.
export const roles = ["ADMIN", "STUDENT", "PARENT"] as const;
export type Role = (typeof roles)[number];

export type SessionPayload = {
  userId: string;
  role: Role;
  /** Must match User.sessionVersion, see getCurrentUser */
  sv: number;
  /** "Remember me": long-lived cookie that is renewed while the user keeps visiting */
  remember: boolean;
};

export type VerifiedSession = SessionPayload & { issuedAt: number };

export const SESSION_COOKIE = "cubick_session";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 180; // 180 days since the last renewal
const SHORT_TOKEN_TTL = 60 * 60 * 12; // not remembered: the cookie dies with the browser, the token after 12h
const RENEW_AFTER = 60 * 60 * 24; // re-issue remembered tokens at most once a day

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}

export async function signSession({ userId, role, sv, remember }: SessionPayload) {
  return new SignJWT({ userId, role, sv, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${remember ? REMEMBER_MAX_AGE : SHORT_TOKEN_TTL}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<VerifiedSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || !isRole(payload.role)) return null;
    return {
      userId: payload.userId,
      role: payload.role,
      // Tokens issued before these fields existed were 30-day "remembered" sessions
      sv: typeof payload.sv === "number" ? payload.sv : 0,
      remember: payload.remember !== false,
      issuedAt: payload.iat ?? 0,
    };
  } catch {
    return null;
  }
}

/** HTTPS requests get Secure cookies; plain http (the local Wi-Fi address) must not, or the browser drops them. */
export function isHttpsRequest(headers: Headers, url?: URL) {
  return headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" || url?.protocol === "https:";
}

export function sessionCookieOptions(remember: boolean, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    // Without maxAge the browser drops the cookie when it closes
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  };
}

export function needsRenewal(session: VerifiedSession) {
  return session.remember && Date.now() / 1000 - session.issuedAt > RENEW_AFTER;
}

export function homePathFor(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STUDENT":
      return "/student";
    case "PARENT":
      return "/parent";
  }
}
