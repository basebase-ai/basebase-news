import { NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { storyService } from "@/services/story.service";

export async function POST(request: Request) {
  console.log("[API/readids] Starting POST request");
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      console.log("[API/readids] No auth token found in Authorization header");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = userService.verifyToken(token);
    console.log("[API/readids] Verified token for userId:", userId);

    const body = await request.json();
    console.log("[API/readids] Raw request body:", body);

    const { storyId } = body;
    console.log("[API/readids] Extracted storyId:", storyId);

    if (!storyId || typeof storyId !== "string") {
      console.log("[API/readids] Invalid storyId:", storyId);
      return NextResponse.json(
        { status: "error", message: "Valid story ID is required" },
        { status: 400 }
      );
    }

    console.log("[API/readids] Calling storyService.addReadId");
    await storyService.addReadId(userId, storyId);
    console.log("[API/readids] Successfully marked story as read");

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[API/readids] Error marking story as read:", error);
    if (error instanceof Error) {
      console.error("[API/readids] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      { status: "error", message: "Failed to mark story as read" },
      { status: 500 }
    );
  }
}
