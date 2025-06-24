import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { edgeAuthService } from "@/services/auth.edge.service";
import { StoryService } from "@/services/story.service";
import { sourceService } from "@/services/source.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { userId } = await edgeAuthService.verifyToken(token);
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    let sourceId = searchParams.get("sourceId");
    const sourceName = searchParams.get("sourceName");
    const before = searchParams.get("before");
    const after = searchParams.get("after");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    // If sourceName is provided and sourceId is not, find the source by name.
    if (sourceName && !sourceId) {
      const matchingSources = await sourceService.searchSources(sourceName);
      if (matchingSources.length > 0) {
        // Use the best match (the first result)
        sourceId = (matchingSources[0] as any)._id.toString();
      } else {
        // If no source matches, return an empty array immediately.
        return NextResponse.json([]);
      }
    }

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
          { error: "Invalid 'before' date format" },
          { status: 400 }
        );
      }
      searchOptions.before = beforeDate;
    }

    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'after' date format" },
          { status: 400 }
        );
      }
      searchOptions.after = afterDate;
    }

    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          { error: "Page must be a positive integer" },
          { status: 400 }
        );
      }
      searchOptions.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return NextResponse.json(
          { error: "Limit must be between 1 and 100" },
          { status: 400 }
        );
      }
      searchOptions.limit = limitNum;
    }

    // Perform the search
    const storyService = new StoryService();

    // Override limit to 5 for this API
    const searchOptionsWithLimit = {
      ...searchOptions,
      limit: 20,
    };

    const searchResults = await storyService.searchStories(
      query,
      searchOptionsWithLimit
    );

    // Transform results to match expected API format - just return the stories array
    const stories = searchResults.stories.map((story) => ({
      id: (story._id as any).toString(),
      headline: story.fullHeadline,
      summary: story.summary || "",
      url: story.articleUrl,
      imageUrl: story.imageUrl || null,
      source: {
        name: story.source.name,
        imageUrl: story.source.imageUrl,
      },
      createdAt: story.createdAt,
    }));

    return NextResponse.json(stories);
  } catch (error) {
    console.error("[Story Search API] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
