import dotenv from "dotenv";
import path from "path";
import { setTask, setTrigger, getDatabase, task, triggers } from "basebase-js";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const TASK_NAME = "scrapeStaleSourcesTask";
const TRIGGER_NAME = "scrapeStaleSourcesTrigger";

async function setupBasebaseScraper(): Promise<void> {
  try {
    // Check if we have necessary environment variables
    const projectApiKey = process.env.BASEBASE_TOKEN;
    if (!projectApiKey) {
      throw new Error("BASEBASE_TOKEN environment variable is required");
    }

    console.log("Setting up Basebase scraper task and trigger...");

    // Create the scraper task
    const taskCode = `
const { sourceService } = require('./services/source.service');
const { scraperService } = require('./services/scraper.service');

exports.handler = async (data) => {
  try {
    console.log('[Basebase Scraper Task] Starting scheduled scrape job');
    
    // Get all sources
    const allSources = await sourceService.getSources();
    console.log(\`[Basebase Scraper Task] Found \${allSources.length} total sources\`);

    // Sort sources by lastScrapedAt (oldest first)
    // Sources that have never been scraped get highest priority
    const sortedSources = allSources.sort((a, b) => {
      if (!a.lastScrapedAt && !b.lastScrapedAt) return 0;
      if (!a.lastScrapedAt) return -1;
      if (!b.lastScrapedAt) return 1;
      
      return new Date(a.lastScrapedAt).getTime() - new Date(b.lastScrapedAt).getTime();
    });

    // Take the 10 oldest sources
    const sourcesToScrape = sortedSources.slice(0, 10);
    
    console.log(
      \`[Basebase Scraper Task] Scraping \${sourcesToScrape.length} sources:\`,
      sourcesToScrape.map(s => s.name).join(', ')
    );

    const results = [];

    // Scrape each source
    for (const source of sourcesToScrape) {
      try {
        console.log(\`[Basebase Scraper Task] Scraping source: \${source.name} (\${source.id})\`);

        // Scrape the source
        await scraperService.scrapeSource(source.id);

        // Update the lastScrapedAt timestamp
        await sourceService.updateSource(source.id, {
          lastScrapedAt: new Date().toISOString(),
        });

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: 'success',
        });

        console.log(\`[Basebase Scraper Task] Successfully scraped \${source.name}\`);
      } catch (error) {
        console.error(\`[Basebase Scraper Task] Error scraping source \${source.name}:\`, error);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(\`[Basebase Scraper Task] Completed: \${successCount} successful, \${errorCount} errors\`);

    return {
      message: 'Scraper task completed',
      totalSources: allSources.length,
      sourcesScraped: sourcesToScrape.length,
      successCount,
      errorCount,
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Basebase Scraper Task] Fatal error:', error);
    throw error;
  }
};
`;

    console.log(
      "Creating scraper task",
      `${process.env.BASEBASE_PROJECT_ID}/${TASK_NAME}`
    );

    // Create task reference
    const taskRef = task(
      getDatabase(process.env.BASEBASE_TOKEN!),
      `${process.env.BASEBASE_PROJECT_ID}/${TASK_NAME}`
    );

    const taskResult = await setTask(taskRef, {
      code: taskCode,
      description:
        "Scrapes the 10 sources that have been lastScrapedAt the longest ago",
      timeout: 300, // 5 minutes timeout
      memoryMB: 256,
    });

    console.log(`Task created successfully: ${taskResult.id}`);

    // Create the trigger to run every 5 minutes
    console.log(
      "Creating trigger to run every 5 minutes",
      process.env.BASEBASE_PROJECT_ID
    );

    // Create triggers reference and trigger reference
    const triggersRef = triggers(
      getDatabase(process.env.BASEBASE_TOKEN!),
      process.env.BASEBASE_PROJECT_ID || ""
    );
    const triggerRef = triggersRef.trigger(TRIGGER_NAME);

    const trigger = await setTrigger(triggerRef, {
      name: TRIGGER_NAME,
      taskName: TASK_NAME,
      schedule: "*/5 * * * *", // Every 5 minutes
      timeZone: "UTC",
      data: {}, // No additional data needed
      enabled: true,
    });

    console.log(`Trigger created successfully: ${TRIGGER_NAME}`);
    console.log(`Next scheduled run: ${trigger.nextRun}`);

    console.log("✅ Basebase scraper setup completed successfully!");
    console.log(
      "The scraper will now run every 5 minutes and scrape the 10 oldest sources."
    );
  } catch (error) {
    console.error("❌ Error setting up Basebase scraper:", error);
    throw error;
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupBasebaseScraper()
    .then(() => {
      console.log("Setup completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}

export { setupBasebaseScraper };
