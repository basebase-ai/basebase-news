import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/reader", "/feed", "/friends", "/sources"];
const authRoutes = ["/auth/signin", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has("auth"); // Adjust based on your auth cookie name

  // If user is on the homepage and authenticated, redirect to reader
  if (pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/reader", request.url));
  }

  // If user tries to access auth pages while authenticated, redirect to reader
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/reader", request.url));
  }

  // If user tries to access protected routes while not authenticated, redirect to signin
  if (!isAuthenticated && protectedRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", ...protectedRoutes, ...authRoutes],
};
