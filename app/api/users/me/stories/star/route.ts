import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userService } from "@/services/user.service";
import { StoryStatus } from "@/models/story-status.model";
import mongoose from "mongoose";

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

    // Find existing story status
    const existingStatus = await StoryStatus.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      storyId: new mongoose.Types.ObjectId(storyId),
    });

    if (existingStatus) {
      // Toggle the starred status
      existingStatus.starred = !existingStatus.starred;
      await existingStatus.save();
      return NextResponse.json({
        status: "ok",
        starred: existingStatus.starred,
      });
    } else {
      // Create new story status with starred=true
      const newStatus = await StoryStatus.create({
        userId: new mongoose.Types.ObjectId(userId),
        storyId: new mongoose.Types.ObjectId(storyId),
        status: "READ" as const,
        starred: true,
      });
      return NextResponse.json({
        status: "ok",
        starred: newStatus.starred,
      });
    }
  } catch (error) {
    console.error("Error toggling star:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
