import { sourceService } from "../services/source.service";
import { basebaseService } from "../services/basebase.service";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listSources() {
  try {
    // Set auth token for BaseBase
    const token = process.env.BASEBASE_TOKEN;
    if (!token) {
      throw new Error("BASEBASE_TOKEN environment variable is required");
    }
    console.log("Using token:", token.substring(0, 10) + "...");
    basebaseService.setToken(token);

    // Get all sources
    const sources = await sourceService.getSources();

    console.log("\nFound", sources.length, "sources:\n");

    // Print each source with its details
    sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}`);
      console.log(`   Homepage: ${source.homepageUrl}`);
      console.log(`   RSS Feed: ${source.rssUrl}`);
      console.log(`   Last Scraped: ${source.lastScrapedAt}`);
      if (source.includeSelector)
        console.log(`   Include Selector: ${source.includeSelector}`);
      if (source.excludeSelector)
        console.log(`   Exclude Selector: ${source.excludeSelector}`);
      if (source.tags?.length)
        console.log(`   Tags: ${source.tags.join(", ")}`);
      if (source.biasScore !== undefined)
        console.log(`   Bias Score: ${source.biasScore}`);
      if (source.hasPaywall !== undefined)
        console.log(`   Has Paywall: ${source.hasPaywall}`);
      console.log(); // Empty line between sources
    });
  } catch (error) {
    console.error("Error listing sources:", error);
    process.exit(1);
  }
}

listSources();
