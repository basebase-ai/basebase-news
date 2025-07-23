import dotenv from "dotenv";
import { doTask, getDatabase } from "basebase-js";

// Load environment variables from both .env.local and .env
dotenv.config({ path: [".env.local", ".env"] });

async function testBasebaseScraper(): Promise<void> {
  try {
    console.log("Testing Basebase scraper task...");

    // Get the token from environment
    const token = process.env.BASEBASE_TOKEN;

    if (!token) {
      throw new Error("BASEBASE_TOKEN environment variable is required");
    }

    // Create database instance with JWT token for server environment
    const db = getDatabase(token);

    // Execute the scraper task (doTask still uses old pattern in v0.1.9)
    const result = await doTask("scrapeStaleSourcesTask", {}, db);

    console.log("Task execution result:");
    console.log(JSON.stringify(result, null, 2));

    console.log("✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing Basebase scraper:", error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBasebaseScraper()
    .then(() => {
      console.log("Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testBasebaseScraper };
