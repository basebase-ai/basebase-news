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

    // Always return JWT token in response body
    return NextResponse.json({
      token: jwtToken,
      message: "Authentication successful",
    });
  } catch (error) {
    console.error("Verification error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Invalid or expired verification link";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
