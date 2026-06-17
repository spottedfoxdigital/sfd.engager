import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// Protect everything except the login page, the login API, health check, and
// static assets.
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/health",
  // Public legal pages (required for Meta App Review).
  "/privacy",
  "/data-deletion",
  // Meta hits these without our session cookie (webhook callbacks, OAuth redirect).
  "/api/meta/webhook",
  "/api/meta/oauth",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (await verifyToken(token)) {
    return NextResponse.next();
  }

  // Redirect browser navigations to login; reject API calls with 401.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
