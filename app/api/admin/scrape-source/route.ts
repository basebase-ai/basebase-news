import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/services/scraper.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sourceId } = await request.json();

    const result =
      await scraperService.scrapeSingleSourceWithValidation(sourceId);

    return NextResponse.json({
      message: "Source scraped successfully",
      ...result,
    });
  } catch (error) {
    console.error("[Scrape Source API] Error scraping source:", error);

    // Handle specific error types with appropriate status codes
    if (error instanceof Error) {
      if (error.message === "sourceId is required") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message === "Source not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      {
        error: "Failed to scrape source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
