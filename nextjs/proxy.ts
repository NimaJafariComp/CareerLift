import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isAuthed = !!req.auth;
  if (isAuthed) return;

  // Public paths
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
});

export const config = {
  // Run on every route except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
