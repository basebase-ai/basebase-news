import { NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, first, last } = body;
    const headersList = headers();
    const host = headersList.get("host") || "";

    await userService.authenticateUser(email, first, last, host);
    return NextResponse.json({ status: "ok", message: "Sign-in email sent" });
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to process sign-in" },
      { status: 500 }
    );
  }
}
