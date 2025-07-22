import { NextRequest, NextResponse } from "next/server";
import { sourceService } from "@/services/source.service";
import { scraperService } from "@/services/scraper.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("[Rescrape API] Starting scheduled rescrape job");

    // Get all sources
    const allSources = await sourceService.getSources();
    console.log(`[Rescrape API] Found ${allSources.length} total sources`);

    // Filter sources that need scraping (haven't been scraped in the past 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const sourcesToScrape = allSources
      .filter((source) => {
        if (!source.lastScrapedAt) {
          return true; // Never scraped before
        }
        const lastScraped = new Date(source.lastScrapedAt);
        return lastScraped < thirtyMinutesAgo;
      })
      .sort((a, b) => {
        // Sources that have never been scraped get highest priority
        if (!a.lastScrapedAt && !b.lastScrapedAt) return 0;
        if (!a.lastScrapedAt) return -1;
        if (!b.lastScrapedAt) return 1;

        // Sort by lastScrapedAt ascending (oldest first)
        return (
          new Date(a.lastScrapedAt).getTime() -
          new Date(b.lastScrapedAt).getTime()
        );
      });

    console.log(
      `[Rescrape API] Found ${sourcesToScrape.length} sources that need scraping`
    );

    // Take only the first 5 sources (which are now the most stale)
    const sourcesToScrapeNow = sourcesToScrape.slice(0, 5);

    if (sourcesToScrapeNow.length === 0) {
      console.log("[Rescrape API] No sources need scraping at this time");
      return NextResponse.json({
        message: "No sources need scraping",
        totalSources: allSources.length,
        sourcesNeedingScraping: 0,
        sourcesScraped: 0,
      });
    }

    console.log(
      `[Rescrape API] Scraping ${sourcesToScrapeNow.length} sources:`,
      sourcesToScrapeNow.map((s) => s.name).join(", ")
    );

    const results = [];

    // Scrape each source
    for (const source of sourcesToScrapeNow) {
      try {
        console.log(
          `[Rescrape API] Scraping source: ${source.name} (${source.id})`
        );

        // Scrape the source
        await scraperService.scrapeSource(source.id);

        // Update the lastScrapedAt timestamp
        await sourceService.updateSource(source.id, {
          lastScrapedAt: new Date().toISOString(),
        });

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "success",
        });

        console.log(`[Rescrape API] Successfully scraped ${source.name}`);
      } catch (error) {
        console.error(
          `[Rescrape API] Error scraping source ${source.name}:`,
          error
        );
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    console.log(
      `[Rescrape API] Completed: ${successCount} successful, ${errorCount} errors`
    );

    return NextResponse.json({
      message: "Rescrape job completed",
      totalSources: allSources.length,
      sourcesNeedingScraping: sourcesToScrape.length,
      sourcesScraped: sourcesToScrapeNow.length,
      successCount,
      errorCount,
      results,
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
