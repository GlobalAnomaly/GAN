import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin/auth";

/**
 * Guards everything under /admin.
 *
 * The admin panel can write to the database and trigger the bot, so it is
 * closed by default: if ADMIN_PASSWORD is unset the panel is unreachable
 * rather than open. Failing closed matters more than convenience here, because
 * the failure mode of the opposite choice is a public write endpoint.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login screen itself has to stay reachable.
  if (pathname === "/admin/login") return NextResponse.next();

  const configured = Boolean(process.env.ADMIN_PASSWORD);
  const valid =
    configured &&
    (await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value));

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
