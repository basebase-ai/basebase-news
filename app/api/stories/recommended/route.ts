import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Story } from "@/models/story.model";
import { StoryStatus } from "@/models/story-status.model";
import { Comment } from "@/models/comment.model";
import { User } from "@/models/user.model";
import { edgeAuthService } from "@/services/auth.edge.service";
import mongoose from "mongoose";
import { verifyAuth } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = await edgeAuthService.verifyToken(token);

    await connectToDatabase();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    // Get stories from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find stories with stars and their star counts
    const starredStories = await StoryStatus.aggregate([
      {
        $match: {
          starred: true,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: "$storyId",
          starCount: { $sum: 1 },
          starredBy: { $push: "$userId" },
        },
      },
      {
        $sort: { starCount: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    // Get the story IDs
    const storyIds = starredStories.map((s) => s._id);

    // Get the stories with their details
    const stories = await Story.find({ _id: { $in: storyIds } })
      .populate("sourceId", "name homepageUrl imageUrl")
      .lean();

    // Get comments for these stories
    const comments = await Comment.find({ storyId: { $in: storyIds } })
      .populate("userId", "first last email imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    // Get user details for the first 10 users who starred each story
    const userIds = [
      ...new Set(starredStories.flatMap((s) => s.starredBy.slice(0, 10))),
    ];
    const users = await User.find({ _id: { $in: userIds } })
      .select("first last email imageUrl")
      .lean();

    // Combine all the data
    const storiesWithDetails = stories.map((story) => {
      const storyStatus = starredStories.find(
        (s) => s._id.toString() === story._id.toString()
      );
      const storyComments = comments.filter(
        (c) => c.storyId.toString() === story._id.toString()
      );
      const starredUsers =
        storyStatus?.starredBy
          .slice(0, 10)
          .map((id: mongoose.Types.ObjectId) =>
            users.find((u) => u._id.toString() === id.toString())
          )
          .filter(Boolean) || [];

      return {
        ...story,
        source: story.sourceId,
        sourceId: undefined,
        starCount: storyStatus?.starCount || 0,
        starredBy: starredUsers,
        comments: storyComments,
      };
    });

    return NextResponse.json({ status: "ok", stories: storiesWithDetails });
  } catch (error) {
    console.error("[Recommended Stories API] Error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
