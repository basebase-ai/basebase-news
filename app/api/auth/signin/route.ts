import { NextRequest, NextResponse } from "next/server";
import { requestCodeSMS } from "@/services/basebase.service";

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json();
    console.log("[API] Received signin request:", { phone, name });

    if (!phone || !name) {
      console.log("[API] Missing required fields:", {
        hasPhone: !!phone,
        hasName: !!name,
      });
      return NextResponse.json(
        { error: "Phone and name are required" },
        { status: 400 }
      );
    }

    console.log("[API] Calling requestCodeSMS...");
    const success = await requestCodeSMS(name, phone);
    console.log("[API] requestCodeSMS result:", success);

    if (success) {
      console.log("[API] Success - returning success response");
      return NextResponse.json({ success: true });
    } else {
      console.log("[API] Failed - requestCodeSMS returned false");
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
