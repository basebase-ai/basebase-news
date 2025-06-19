import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { edgeAuthService } from "@/services/auth.edge.service";
import { StoryService } from "@/services/story.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = await edgeAuthService.verifyToken(token);
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const sourceId = searchParams.get("sourceId");
    const before = searchParams.get("before");
    const after = searchParams.get("after");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    // Parse and validate optional parameters
    const searchOptions: {
      sourceId?: string;
      before?: Date;
      after?: Date;
      page?: number;
      limit?: number;
    } = {};

    if (sourceId) {
      searchOptions.sourceId = sourceId;
    }

    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { status: "error", message: "Invalid 'before' date format" },
          { status: 400 }
        );
      }
      searchOptions.before = beforeDate;
    }

    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) {
        return NextResponse.json(
          { status: "error", message: "Invalid 'after' date format" },
          { status: 400 }
        );
      }
      searchOptions.after = afterDate;
    }

    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          { status: "error", message: "Page must be a positive integer" },
          { status: 400 }
        );
      }
      searchOptions.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return NextResponse.json(
          { status: "error", message: "Limit must be between 1 and 100" },
          { status: 400 }
        );
      }
      searchOptions.limit = limitNum;
    }

    // Perform the search
    const storyService = new StoryService();
    const searchResults = await storyService.searchStories(
      query,
      searchOptions
    );

    // Transform results to match API specification
    const stories = searchResults.stories.map((story) => ({
      id: (story._id as any).toString(),
      url: story.articleUrl,
      headline: story.fullHeadline,
      summary: story.summary,
      createdAt: story.createdAt,
      source: {
        id: (story.source._id as any).toString(),
        name: story.source.name,
        homepage: story.source.homepageUrl,
        imageUrl: story.source.imageUrl,
        biasScore: story.source.biasScore,
        tags: story.source.tags || [],
      },
    }));

    return NextResponse.json({
      status: "ok",
      data: {
        stories,
        pagination: {
          page: searchResults.page,
          limit: searchResults.limit,
          totalCount: searchResults.totalCount,
          hasMore: searchResults.hasMore,
        },
        query: query ? query.trim() : null,
        filters: {
          sourceId: searchOptions.sourceId || null,
          before: searchOptions.before || null,
          after: searchOptions.after || null,
        },
      },
    });
  } catch (error) {
    console.error("[Story Search API] Error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
