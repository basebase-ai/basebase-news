import { NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    console.log("Received sign-in request");
    const body = await request.json();
    console.log("Request body:", body);

    const { email, first, last } = body;
    if (!email || !first || !last) {
      console.error("Missing required fields:", { email, first, last });
      return NextResponse.json(
        { status: "error", message: "Missing required fields" },
        { status: 400 }
      );
    }

    const headersList = headers();
    const host = headersList.get("host") || "";
    console.log("Host:", host);

    try {
      await userService.authenticateUser(email, first, last, host);
      console.log("Authentication successful");
      return NextResponse.json({ status: "ok", message: "Sign-in email sent" });
    } catch (error) {
      console.error("Authentication error details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to process sign-in",
      },
      { status: 500 }
    );
  }
}
