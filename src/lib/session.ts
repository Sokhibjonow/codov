import { cookies, headers } from "next/headers";
import {
  isHttpsRequest,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session-token";

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const secure = isHttpsRequest(await headers());
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(payload.remember, secure));
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
