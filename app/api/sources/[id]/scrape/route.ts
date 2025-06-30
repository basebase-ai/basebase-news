import { NextResponse } from "next/server";
import { Source } from "@/models/source.model";
import { connectToDatabase } from "@/services/mongodb.service";
import { scraperService } from "@/services/scraper.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const sourceId = params.id;
    const source = await Source.findById(sourceId);

    if (!source) {
      return NextResponse.json(
        { status: "error", message: "Source not found" },
        { status: 404 }
      );
    }

    // Await the scrape and get the updated source
    await scraperService.scrapeSource(source);
    const updatedSource = await Source.findById(sourceId);

    return NextResponse.json({
      status: "ok",
      message: "Source scraped successfully",
      source: updatedSource,
    });
  } catch (error) {
    console.error("Error in scrape endpoint:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
