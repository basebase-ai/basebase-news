import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip auth check for public routes
  if (
    request.nextUrl.pathname === "/api/auth/signin" ||
    request.nextUrl.pathname === "/api/auth/verify"
  ) {
    return NextResponse.next();
  }

  // Check authentication for all other API routes
  const token = request.cookies.get("auth")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Ensure the request stays on the same domain
  const response = NextResponse.next();
  response.headers.set("x-middleware-skip", "1");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
