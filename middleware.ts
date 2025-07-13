import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { initializeApp, getBasebase } from "basebase";

const PUBLIC_API_ROUTES = [
  "/api/auth/signin",
  "/api/auth/verify",
  "/api/health",
  "/api/preview",
];

const ADMIN_API_ROUTES = ["/api/admin/rescrape"];

// Function to validate token with BaseBase
async function validateToken(token: string): Promise<boolean> {
  try {
    const apiKey = process.env.BASEBASE_API_KEY;
    if (!apiKey) {
      console.error("BASEBASE_API_KEY is not set");
      return false;
    }

    // Initialize BaseBase with the user's token to validate it
    // Use unique app name to avoid conflicts with existing app
    const app = initializeApp(
      {
        apiKey,
        token: token,
      },
      `middleware-${Date.now()}`
    );
    const basebase = getBasebase(app);

    // Try to decode the token to verify it's valid JWT format
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.userId) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all API routes by default
  if (pathname.startsWith("/api/")) {
    // Allow public API routes
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Check for server-to-server cron secret for admin routes
    if (ADMIN_API_ROUTES.some((route) => pathname.startsWith(route))) {
      const authHeader = request.headers.get("authorization");
      if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.next();
      }
    }

    // For all other API routes, validate the Bearer token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token || !(await validateToken(token))) {
      return NextResponse.json(
        { error: "A valid Bearer token is required." },
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
