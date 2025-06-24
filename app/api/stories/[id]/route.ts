import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Story } from "@/models/story.model";
import { StoryStatus } from "@/models/story-status.model";
import { Source } from "@/models/source.model";
import { edgeAuthService } from "@/services/auth.edge.service";
import { User } from "@/models/user.model";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    console.log("[/api/stories/[id]] GET request received for ID:", params.id);

    await connectToDatabase();
    console.log("[/api/stories/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/stories/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/stories/[id]] No token found in request");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("[/api/stories/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/stories/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/stories/[id]] User lookup:", {
      userFound: !!user,
      userEmail: user?.email || null,
    });

    if (!user) {
      console.error("[/api/stories/[id]] User not found for ID:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const storyId = params.id;

    // Validate the story ID format
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      console.error("[/api/stories/[id]] Invalid story ID format:", storyId);
      return NextResponse.json(
        { error: "Invalid story ID format" },
        { status: 400 }
      );
    }

    console.log("[/api/stories/[id]] Looking up story:", storyId);

    // Find the story and populate source information
    const story = await Story.findById(storyId)
      .populate("sourceId", "name homepageUrl imageUrl biasScore tags")
      .lean();

    console.log("[/api/stories/[id]] Story lookup result:", {
      storyFound: !!story,
      storyHeadline: story?.fullHeadline?.substring(0, 50) || null,
    });

    if (!story) {
      console.error("[/api/stories/[id]] Story not found:", storyId);
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if user has access to this story's source
    const sourceId = (story.sourceId as any)._id.toString();
    const userHasAccess = user.sourceIds
      .map((id) => id.toString())
      .includes(sourceId);

    console.log("[/api/stories/[id]] Access check:", {
      userSourceCount: user.sourceIds.length,
      userHasAccess,
      sourceId,
    });

    if (!userHasAccess) {
      console.error("[/api/stories/[id]] User not authorized for story:", {
        userId,
        sourceId,
      });
      return NextResponse.json(
        { error: "Not authorized to access this story" },
        { status: 403 }
      );
    }

    // Get user's status for this story (read/starred)
    const storyStatus = await StoryStatus.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      storyId: new mongoose.Types.ObjectId(storyId),
    }).lean();

    console.log("[/api/stories/[id]] Story status:", {
      hasStatus: !!storyStatus,
      status: storyStatus?.status || "UNREAD",
      starred: storyStatus?.starred || false,
    });

    console.log("[/api/stories/[id]] Success - returning story data");

    // Transform the story data to match expected API format
    const responseData = {
      _id: story._id.toString(),
      headline: story.fullHeadline,
      body: story.fullText || story.summary || "",
      url: story.articleUrl,
      source: (story.sourceId as any).name,
      createdAt: story.createdAt,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[/api/stories/[id]] Error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/stories/[id]] Invalid token error");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
