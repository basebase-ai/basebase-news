import { NextRequest, NextResponse } from "next/server";
import { sourceService } from "@/services/source.service";
import { scraperService } from "@/services/scraper.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    console.log(`[Scrape Source API] Starting scrape for source: ${sourceId}`);

    // Get the source to validate it exists
    const source = await sourceService.getSource(sourceId);
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Scrape the source
    await scraperService.scrapeSource(sourceId);

    // Update the lastScrapedAt timestamp
    await sourceService.updateSource(sourceId, {
      lastScrapedAt: new Date().toISOString(),
    });

    console.log(
      `[Scrape Source API] Successfully scraped source: ${source.name}`
    );

    return NextResponse.json({
      message: "Source scraped successfully",
      sourceId,
      sourceName: source.name,
      lastScrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Scrape Source API] Error scraping source:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
