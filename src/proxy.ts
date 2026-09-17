import { NextResponse, type NextRequest } from "next/server";
import {
  homePathFor,
  isHttpsRequest,
  needsRenewal,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type Role,
} from "@/lib/session-token";

const areas: [prefix: string, role: Role][] = [
  ["/admin", "ADMIN"],
  ["/student", "STUDENT"],
  ["/parent", "PARENT"],
];

// Fast cookie-only check. Layouts re-check the user in the database
// (so deactivated accounts and reset passwords lock the user out immediately).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL(homePathFor(session.role), request.url))
      : NextResponse.next();
  }

  const area = areas.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== area[1]) {
      return NextResponse.redirect(new URL(homePathFor(session.role), request.url));
    }
  }

  const response = NextResponse.next();

  // Sliding expiration: a student who keeps coming to lessons never has to log in again
  if (session && needsRenewal(session)) {
    const { userId, role, sv, remember } = session;
    response.cookies.set(
      SESSION_COOKIE,
      await signSession({ userId, role, sv, remember }),
      sessionCookieOptions(remember, isHttpsRequest(request.headers, request.nextUrl)),
    );
  }

  return response;
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/student/:path*", "/parent/:path*"],
};
