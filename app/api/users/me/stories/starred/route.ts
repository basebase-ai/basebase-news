import { NextResponse } from "next/server";
import { storyService } from "@/services/story.service";
import { userService } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    console.log("[GET /api/users/me/stories/starred] Starting request");
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      console.log("[GET /api/users/me/stories/starred] No token found");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const { userId } = userService.verifyToken(token);
    if (!userId) {
      console.log("[GET /api/users/me/stories/starred] Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log(
      "[GET /api/users/me/stories/starred] Fetching starred stories for user:",
      userId
    );
    const starredStories = await storyService.getStarredStories(userId);
    console.log(
      "[GET /api/users/me/stories/starred] Found stories:",
      starredStories.length
    );

    return NextResponse.json({ status: "ok", starredStories });
  } catch (error) {
    console.error("[GET /api/users/me/stories/starred] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
