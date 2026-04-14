import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge middleware must not import `@/auth` — that pulls in bcrypt → node-gyp-build,
 * which is Node-only and crashes with "Cannot read properties of undefined (reading 'modules')".
 * JWT checks use `getToken` instead, which is Edge-compatible.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const { pathname } = req.nextUrl;
  const isAuthed = !!token;

  if (pathname.startsWith("/games") && !isAuthed) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/me") && !isAuthed) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/settings") && !isAuthed) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/profile") && !isAuthed) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      const u = new URL("/login", req.nextUrl.origin);
      u.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(u);
    }
    if (!token?.isAdmin) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/games/:path*", "/admin/:path*", "/me/:path*", "/settings/:path*", "/profile/:path*"],
};
