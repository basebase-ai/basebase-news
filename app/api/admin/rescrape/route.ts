import { NextResponse } from "next/server";
import { ScraperService } from "@/services/scraper.service";

const scraperService = new ScraperService();

export async function POST() {
  try {
    await scraperService.scrapeAllSources();
    return NextResponse.json({
      status: "ok",
      message: "Complete rescrape initiated",
    });
  } catch (error) {
    console.error("Error in complete rescrape:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
