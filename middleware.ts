import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { edgeAuthService } from "./services/auth.edge.service";

const PUBLIC_API_ROUTES = [
  "/api/auth/signin",
  "/api/auth/verify",
  "/api/health",
  "/api/preview",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all API routes by default
  if (pathname.startsWith("/api/")) {
    // Allow public API routes
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // For all other API routes, validate the Bearer token
    const token = edgeAuthService.extractTokenFromRequest(request);

    if (!token || !(await edgeAuthService.validateToken(token))) {
      return NextResponse.json(
        { error: "Unauthorized", message: "A valid Bearer token is required." },
        { status: 401 }
      );
    }
  }

  // Allow all non-API routes to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
