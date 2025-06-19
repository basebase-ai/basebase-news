import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Source, ISource } from "@/models/source.model";
import { edgeAuthService } from "@/services/auth.edge.service";
import { User } from "@/models/user.model";
import { Types } from "mongoose";
import { Story } from "@/models/story.model";
import { StoryStatus } from "@/models/story-status.model";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("[/api/sources/[id]] GET request received for ID:", params.id);

    await connectToDatabase();
    console.log("[/api/sources/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/sources/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/sources/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/sources/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/sources/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/sources/[id]] User lookup:", {
      userFound: !!user,
      userEmail: user?.email || null,
    });

    if (!user) {
      console.error("[/api/sources/[id]] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const sourceId = params.id;
    console.log("[/api/sources/[id]] Looking up source:", sourceId);

    const source = (await Source.findById(sourceId).lean()) as
      | (ISource & { _id: Types.ObjectId })
      | null;

    console.log("[/api/sources/[id]] Source lookup result:", {
      sourceFound: !!source,
      sourceName: source?.name || null,
    });

    if (!source) {
      console.error("[/api/sources/[id]] Source not found:", sourceId);
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    const userHasAccess = user.sourceIds
      .map((id) => id.toString())
      .includes(source._id.toString());
    console.log("[/api/sources/[id]] Access check:", {
      userSourceCount: user.sourceIds.length,
      userHasAccess,
      sourceId: source._id.toString(),
    });

    if (!userHasAccess) {
      console.error("[/api/sources/[id]] User not authorized for source:", {
        userId,
        sourceId: source._id.toString(),
      });
      return NextResponse.json(
        { status: "error", message: "Not authorized to access this source" },
        { status: 403 }
      );
    }

    console.log("[/api/sources/[id]] Fetching stories for source...");
    const stories = await Story.find({
      sourceId: source._id,
      archived: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log("[/api/sources/[id]] Stories found:", stories.length);

    // Get read and star status for each story
    const storyIds = stories.map((story) => story._id);
    const storyStatuses = await StoryStatus.find({
      userId: user._id,
      storyId: { $in: storyIds },
    }).lean();

    console.log(
      "[/api/sources/[id]] Story statuses found:",
      storyStatuses.length
    );

    const statusMap = new Map(
      storyStatuses.map((status) => [
        status.storyId.toString(),
        { status: status.status, starred: status.starred },
      ])
    );

    console.log("[/api/sources/[id]] Success - returning source data");
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
    console.error("[/api/sources/[id]] Error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/sources/[id]] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

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
    console.log("[/api/sources/[id]] PUT request received for ID:", params.id);

    await connectToDatabase();
    console.log("[/api/sources/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/sources/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/sources/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/sources/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/sources/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/sources/[id]] User lookup:", {
      userFound: !!user,
      isAdmin: user?.isAdmin || false,
    });

    if (!user?.isAdmin) {
      console.error("[/api/sources/[id]] User not authorized - not admin");
      return NextResponse.json(
        { status: "error", message: "Not authorized" },
        { status: 403 }
      );
    }

    const sourceId = params.id;
    const body = await req.json();
    console.log("[/api/sources/[id]] Update data received:", Object.keys(body));

    const updatedSource = await Source.findByIdAndUpdate(
      sourceId,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    console.log("[/api/sources/[id]] Update result:", {
      found: !!updatedSource,
      sourceId,
    });

    if (!updatedSource) {
      console.error(
        "[/api/sources/[id]] Source not found for update:",
        sourceId
      );
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    console.log("[/api/sources/[id]] Source updated successfully");
    return NextResponse.json({ status: "ok", source: updatedSource });
  } catch (error) {
    console.error("[/api/sources/[id]] Update error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/sources/[id]] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

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
    console.log(
      "[/api/sources/[id]] DELETE request received for ID:",
      params.id
    );

    await connectToDatabase();
    console.log("[/api/sources/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/sources/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/sources/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/sources/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/sources/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/sources/[id]] User lookup:", {
      userFound: !!user,
      isAdmin: user?.isAdmin || false,
    });

    if (!user?.isAdmin) {
      console.error("[/api/sources/[id]] User not authorized - not admin");
      return NextResponse.json(
        { status: "error", message: "Not authorized" },
        { status: 403 }
      );
    }

    const sourceId = params.id;
    console.log("[/api/sources/[id]] Deleting source:", sourceId);

    const deletedSource = await Source.findByIdAndDelete(sourceId).lean();
    console.log("[/api/sources/[id]] Delete result:", {
      found: !!deletedSource,
      sourceId,
    });

    if (!deletedSource) {
      console.error(
        "[/api/sources/[id]] Source not found for deletion:",
        sourceId
      );
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    console.log("[/api/sources/[id]] Source deleted successfully");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[/api/sources/[id]] Delete error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/sources/[id]] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
