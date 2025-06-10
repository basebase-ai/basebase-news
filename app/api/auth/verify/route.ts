import { NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      throw new Error("Invalid token");
    }

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Set JWT cookie
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    return response;
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { error: "Invalid or expired sign-in link" },
      { status: 400 }
    );
  }
}
