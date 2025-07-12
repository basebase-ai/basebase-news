import { storyService } from "../services/story.service";
// Note: basebaseService is no longer needed as services handle their own database connections
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listStories() {
  try {
    // BaseBase authentication is now handled automatically via API key
    console.log("Fetching stories from BaseBase...");

    const result = await storyService.searchStories(null, { limit: 100 });
    console.log("\nFound", result.stories.length, "stories:\n");

    // Print each story with its details
    result.stories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.headline}`);
      console.log(`   URL: ${story.url}`);
      console.log(`   Source: ${story.newsSource}`);
      console.log(
        `   Created: ${new Date(story.createdAt || story.publishedAt).toLocaleString()}`
      );
      console.log("");
    });
  } catch (error) {
    console.error("Failed to list stories:", error);
    process.exit(1);
  }
}

// Run the script
listStories();
