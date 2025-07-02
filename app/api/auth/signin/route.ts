import { NextRequest, NextResponse } from "next/server";
import { basebaseAuthService } from "@/services/basebase.auth.service";

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json();

    if (!phone || !name) {
      return NextResponse.json(
        { error: "Phone and name are required" },
        { status: 400 }
      );
    }

    const success = await basebaseAuthService.requestCode(phone, name);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[/api/auth/signin] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
