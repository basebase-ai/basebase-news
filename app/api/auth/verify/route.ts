import { NextRequest, NextResponse } from "next/server";
import { basebaseAuthService } from "@/services/basebase.auth.service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const phone = searchParams.get("phone");
    const code = searchParams.get("code");

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and code are required" },
        { status: 400 }
      );
    }

    const token = await basebaseAuthService.verifyCode(phone, code);

    if (token) {
      return NextResponse.json({ token });
    } else {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("[/api/auth/verify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
