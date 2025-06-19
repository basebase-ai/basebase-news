import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Comment } from "@/models/comment.model";
import { Story } from "@/models/story.model";
import { edgeAuthService } from "@/services/auth.edge.service";
import { User } from "@/models/user.model";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("[/api/comments] GET request received");
    await connectToDatabase();
    console.log("[/api/comments] Database connected");

    // Ensure models are registered
    console.log("[/api/comments] Ensuring models are registered...");
    console.log("[/api/comments] Comment model:", Comment.modelName);
    console.log("[/api/comments] Story model:", Story.modelName);
    console.log("[/api/comments] User model:", User.modelName);

    const token = edgeAuthService.extractTokenFromRequest(request);
    console.log("[/api/comments] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/comments] No auth token found");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/comments] Token found, verifying...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/comments] Token verified for userId:", userId);

    const user = await User.findById(userId);
    console.log(
      "[/api/comments] User lookup result:",
      user ? "found" : "not found"
    );

    if (!user) {
      console.error("[/api/comments] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    console.log("[/api/comments] Querying comments...");
    const comments = await Comment.find({})
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl")
      .sort({ createdAt: -1 })
      .limit(100);

    console.log("[/api/comments] Found", comments.length, "comments");
    return NextResponse.json({ status: "ok", comments });
  } catch (error) {
    console.error("[/api/comments] Error getting comments:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/comments] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
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
    console.log("[/api/comments] POST request received");
    await connectToDatabase();
    console.log("[/api/comments] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(request);
    console.log("[/api/comments] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/comments] No auth token found");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/comments] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/comments] Token verified for userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/comments] User lookup:", {
      userFound: !!user,
      userId,
    });

    if (!user) {
      console.error("[/api/comments] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const body: CommentRequestBody = await request.json();
    const { storyId, text } = body;
    console.log("[/api/comments] Request body:", {
      hasStoryId: !!storyId,
      hasText: !!text,
      textLength: text?.length || 0,
    });

    if (!storyId || !text?.trim()) {
      console.error("[/api/comments] Missing required fields");
      return NextResponse.json(
        {
          error: "Bad request",
          message: "StoryId and text are required fields",
        },
        { status: 400 }
      );
    }

    // Verify the story exists
    console.log("[/api/comments] Verifying story exists:", storyId);
    const story = await Story.findById(storyId);
    if (!story) {
      console.error("[/api/comments] Story not found:", storyId);
      return NextResponse.json(
        { status: "error", message: "Story not found" },
        { status: 404 }
      );
    }

    console.log("[/api/comments] Creating new comment...");
    const newComment = new Comment({
      storyId,
      userId: user._id,
      text: text.trim(),
    });

    await newComment.save();
    await newComment.populate("userId", "first last email imageUrl");
    await newComment.populate("storyId", "fullHeadline articleUrl");

    console.log("[/api/comments] Comment created successfully");
    return NextResponse.json(
      { status: "ok", comment: newComment },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/comments] Error creating comment:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/comments] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
