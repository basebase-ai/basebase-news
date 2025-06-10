import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Source, ISource } from "@/models/source.model";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { Types } from "mongoose";
import { Story } from "@/models/story.model";
import { StoryStatus } from "@/models/story-status.model";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const sourceId = params.id;
    const source = (await Source.findById(sourceId).lean()) as
      | (ISource & { _id: Types.ObjectId })
      | null;

    if (!source) {
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    if (
      !user.sourceIds.map((id) => id.toString()).includes(source._id.toString())
    ) {
      return NextResponse.json(
        { status: "error", message: "Not authorized to access this source" },
        { status: 403 }
      );
    }

    const stories = await Story.find({
      sourceId: source._id,
      archived: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get read and star status for each story
    const storyIds = stories.map((story) => story._id);
    const storyStatuses = await StoryStatus.find({
      userId: user._id,
      storyId: { $in: storyIds },
    }).lean();

    const statusMap = new Map(
      storyStatuses.map((status) => [
        status.storyId.toString(),
        { status: status.status, starred: status.starred },
      ])
    );

    return NextResponse.json({
      status: "ok",
      source: {
        id: source._id.toString(),
        name: source.name,
        homepageUrl: source.homepageUrl,
        rssUrl: source.rssUrl,
        includeSelector: source.includeSelector,
        excludeSelector: source.excludeSelector,
        biasScore: source.biasScore,
        lastScrapedAt: source.lastScrapedAt,
        tags: source.tags,
        imageUrl: source.imageUrl,
        hasPaywall: source.hasPaywall,
        stories: stories.map((story) => {
          const storyStatus = statusMap.get(story._id.toString());
          return {
            id: story._id.toString(),
            articleUrl: story.articleUrl,
            fullHeadline: story.fullHeadline,
            summary: story.summary,
            section: story.section,
            type: story.type,
            inPageRank: story.inPageRank,
            imageUrl: story.imageUrl,
            authorNames: story.authorNames,
            createdAt: story.createdAt,
            lastScrapedAt: story.lastScrapedAt,
            status: storyStatus?.status || "UNREAD",
            starred: storyStatus?.starred || false,
          };
        }),
      },
    });
  } catch (error) {
    console.error("[Source API] Error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!user?.isAdmin) {
      return NextResponse.json(
        { status: "error", message: "Not authorized" },
        { status: 403 }
      );
    }

    const sourceId = params.id;
    const body = await req.json();

    const updatedSource = await Source.findByIdAndUpdate(
      sourceId,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSource) {
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", source: updatedSource });
  } catch (error) {
    console.error("[Source API] Error updating source:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!user?.isAdmin) {
      return NextResponse.json(
        { status: "error", message: "Not authorized" },
        { status: 403 }
      );
    }

    const sourceId = params.id;
    const deletedSource = await Source.findByIdAndDelete(sourceId).lean();

    if (!deletedSource) {
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Source API] Error deleting source:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
