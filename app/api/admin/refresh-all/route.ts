import { NextResponse } from "next/server";
import { scraperService } from "@/services/scraper.service";
import { verifyAuth } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    // 1. Verify user is authenticated
    await verifyAuth(request);

    // 2. Start the scrape
    // We don't await this because it can be a long-running process
    scraperService.scrapeAllSources().catch((error) => {
      console.error("[refresh-all] Error during background scrape:", error);
    });

    return NextResponse.json({
      status: "ok",
      message: "Complete rescrape initiated for all sources.",
    });
  } catch (error) {
    console.error("Error in client rescrape endpoint:", error);
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("No token") ||
        error.message.includes("Invalid token"));
    if (isAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
