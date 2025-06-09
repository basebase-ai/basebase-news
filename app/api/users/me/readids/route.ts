import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userService } from "@/services/user.service";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth")?.value;

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = userService.verifyToken(token);
    const { storyId } = await request.json();

    if (!storyId) {
      return NextResponse.json(
        { status: "error", message: "Story ID is required" },
        { status: 400 }
      );
    }

    await userService.addReadId(userId, storyId);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error marking story as read:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to mark story as read" },
      { status: 500 }
    );
  }
}
