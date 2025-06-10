import { NextResponse } from "next/server";
import { storyService } from "@/services/story.service";
import { userService } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    console.log("[GET /api/users/me/stories/starred] Starting request");
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const { userId } = userService.verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const starredStories = await storyService.getStarredStories(userId);
    return NextResponse.json({ status: "ok", starredStories });
  } catch (error) {
    console.error("[GET /api/users/me/stories/starred] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
