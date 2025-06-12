import { NextResponse } from "next/server";
import { userService } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const token = searchParams.get("token");

    let jwtToken: string;

    if (code) {
      // New short code flow
      jwtToken = await userService.verifyCode(code);
    } else if (token) {
      // Legacy JWT token flow (for backward compatibility)
      const { userId } = userService.verifyToken(token);
      if (!userId) {
        throw new Error("Invalid token");
      }
      jwtToken = token;
    } else {
      throw new Error("Invalid verification link");
    }

    // Set JWT cookie
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }
}
