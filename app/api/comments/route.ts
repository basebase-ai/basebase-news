import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Comment } from "@/models/comment.model";
import { Story } from "@/models/story.model";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { cookies } from "next/headers";

export async function GET(): Promise<NextResponse> {
  try {
    console.log("[Comments API] Starting GET request");
    await connectToDatabase();
    console.log("[Comments API] Database connected");

    // Ensure models are registered
    console.log("[Comments API] Ensuring models are registered...");
    console.log("[Comments API] Comment model:", Comment.modelName);
    console.log("[Comments API] Story model:", Story.modelName);
    console.log("[Comments API] User model:", User.modelName);

    const tokenCookie = cookies().get("auth");
    if (!tokenCookie) {
      console.log("[Comments API] No auth token found");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }
    const token = tokenCookie.value;
    console.log("[Comments API] Token found, verifying...");

    const { userId } = userService.verifyToken(token);
    console.log("[Comments API] Token verified for userId:", userId);

    const user = await User.findById(userId);
    console.log(
      "[Comments API] User lookup result:",
      user ? "found" : "not found"
    );

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    console.log("[Comments API] Querying comments...");
    const comments = await Comment.find({})
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl")
      .sort({ createdAt: -1 })
      .limit(100);

    console.log("[Comments API] Found", comments.length, "comments");
    return NextResponse.json({ status: "ok", comments });
  } catch (error) {
    console.error("[Comments API] Error getting comments:", error);
    if (error instanceof Error) {
      console.error("[Comments API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

interface CommentRequestBody {
  storyId: string;
  text: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();

    const tokenCookie = cookies().get("auth");
    if (!tokenCookie) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }
    const token = tokenCookie.value;

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const body: CommentRequestBody = await request.json();
    const { storyId, text } = body;

    if (!storyId || !text?.trim()) {
      return NextResponse.json(
        {
          error: "Bad request",
          message: "StoryId and text are required fields",
        },
        { status: 400 }
      );
    }

    // Verify the story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return NextResponse.json(
        { status: "error", message: "Story not found" },
        { status: 404 }
      );
    }

    const newComment = new Comment({
      storyId,
      userId: user._id,
      text: text.trim(),
    });

    await newComment.save();
    await newComment.populate("userId", "first last email imageUrl");
    await newComment.populate("storyId", "fullHeadline articleUrl");

    return NextResponse.json(
      { status: "ok", comment: newComment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
