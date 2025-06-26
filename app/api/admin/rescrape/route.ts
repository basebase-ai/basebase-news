import { NextRequest, NextResponse } from "next/server";
import { ScraperService } from "@/services/scraper.service";
import { edgeAuthService } from "@/services/auth.edge.service";

const scraperService = new ScraperService();

export async function GET(request: NextRequest) {
  const isCron =
    request.headers.get("Authorization") ===
    `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    try {
      await scraperService.scrapeAllSources();
      return NextResponse.json({
        status: "ok",
        message: "Complete rescrape initiated by cron",
      });
    } catch (error) {
      console.error("Error in complete rescrape:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  const token = edgeAuthService.extractTokenFromRequest(request);
  if (!token || !(await edgeAuthService.validateToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await scraperService.scrapeAllSources();
    return NextResponse.json({
      status: "ok",
      message: "Complete rescrape initiated by user",
    });
  } catch (error) {
    console.error("Error in complete rescrape:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
