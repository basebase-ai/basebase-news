import { NextRequest, NextResponse } from "next/server";
import { StoryStatus } from "@/models/story-status.model";
import mongoose from "mongoose";
import { edgeAuthService } from "@/services/auth.edge.service";
import { connectToDatabase } from "@/services/mongodb.service";

async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  const token = edgeAuthService.extractTokenFromRequest(request);
  if (!token) return null;
  try {
    const { userId } = await edgeAuthService.verifyToken(token);
    return userId;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { storyId, comment } = await request.json();

    if (!storyId) {
      return NextResponse.json(
        { status: "error", message: "Story ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const update = {
      $set: {
        starred: true,
        userId: new mongoose.Types.ObjectId(userId),
        storyId: new mongoose.Types.ObjectId(storyId),
      },
      $setOnInsert: {
        status: "NONE" as const,
      },
    };
    if (comment) {
      (update.$set as any).comment = comment;
    }

    const updatedStatus = await StoryStatus.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        storyId: new mongoose.Types.ObjectId(storyId),
      },
      update,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      status: "ok",
      starred: updatedStatus.starred,
    });
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

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { storyId } = await request.json();

    if (!storyId) {
      return NextResponse.json(
        { status: "error", message: "Story ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    await StoryStatus.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        storyId: new mongoose.Types.ObjectId(storyId),
      },
      { $set: { starred: false } }
    );

    return NextResponse.json({
      status: "ok",
      starred: false,
    });
  } catch (error) {
    console.error("Error un-starring:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
