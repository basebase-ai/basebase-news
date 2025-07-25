import { NextRequest, NextResponse } from "next/server";
import { scraperService } from "@/services/scraper.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await scraperService.performScheduledRescrape();

    if (result.sourcesScraped === 0) {
      return NextResponse.json({
        message: "No sources need scraping",
        ...result,
      });
    }

    return NextResponse.json({
      message: "Rescrape job completed",
      ...result,
    });
  } catch (error) {
    console.error("[Rescrape API] Error in rescrape job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
