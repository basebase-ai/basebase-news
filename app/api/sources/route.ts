import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Source } from "@/models/source.model";
import { scraperService } from "@/services/scraper.service";
import { verifyAuth } from "@/services/auth.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify authentication
  try {
    await verifyAuth(request);
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized", message: "A valid Bearer token is required" },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();
    const sources = await Source.find({}).sort({ name: 1 });
    return NextResponse.json(sources);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting sources:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

interface SourceRequestBody {
  name: string;
  homepageUrl: string;
  rssUrl: string;
  includeSelector: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authentication
  try {
    const { isAdmin } = await verifyAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized", message: "A valid Bearer token is required" },
      { status: 401 }
    );
  }

  try {
    console.log("POST /api/sources");
    await connectToDatabase();
    const body = await request.json();
    const { name, homepageUrl, includeSelector, rssUrl } = body;

    if (!name || !homepageUrl) {
      return NextResponse.json(
        {
          error: "Bad request",
          message: "Name and homepageUrl are required fields",
        },
        { status: 400 }
      );
    }

    const normalizedUrl = homepageUrl.trim().replace(/\/+$/, "");
    const existingSource = await Source.findOne({ homepageUrl: normalizedUrl });
    if (existingSource) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "A source with this URL already exists",
          source: existingSource,
        },
        { status: 409 }
      );
    }

    const newSource = new Source({
      name,
      homepageUrl: normalizedUrl,
      includeSelector,
      rssUrl,
    });
    await newSource.save();

    console.log("POST /api/sources: newSource", newSource);

    scraperService.scrapeSource(newSource).catch((error) => {
      console.error(`Error scraping source ${newSource.name}:`, error);
    });

    return NextResponse.json({ source: newSource }, { status: 201 });
  } catch (error) {
    console.error("Error creating source:", error);
    if (error instanceof Error && (error as any).code === 11000) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "A source with this URL already exists",
        },
        { status: 409 }
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
