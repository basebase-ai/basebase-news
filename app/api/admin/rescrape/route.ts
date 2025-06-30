import { NextRequest, NextResponse } from "next/server";
import { ScraperService } from "@/services/scraper.service";
import { edgeAuthService } from "@/services/auth.edge.service";

const scraperService = new ScraperService();

export async function GET(request: NextRequest) {
  const isCron =
    request.headers.get("Authorization") ===
    `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    // Start the scrape without awaiting - let it run in background
    scraperService.scrapeAllSources().catch((error) => {
      console.error("[rescrape] Error during background scrape (cron):", error);
    });

    return NextResponse.json({
      status: "ok",
      message: "Complete rescrape initiated by cron",
    });
  }

  const token = edgeAuthService.extractTokenFromRequest(request);
  if (!token || !(await edgeAuthService.validateToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Start the scrape without awaiting - let it run in background
  scraperService.scrapeAllSources().catch((error) => {
    console.error("[rescrape] Error during background scrape (user):", error);
  });

  return NextResponse.json({
    status: "ok",
    message: "Complete rescrape initiated by user",
  });
}
