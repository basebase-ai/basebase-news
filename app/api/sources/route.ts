import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Source } from "@/models/source.model";

export async function GET(): Promise<NextResponse> {
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
  includeSelector: string;
  feedUrl: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, homepageUrl, includeSelector, feedUrl } = body;

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
      feedUrl,
    });
    await newSource.save();

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
