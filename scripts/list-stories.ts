import { storyService } from "../services/story.service";
import { basebaseService } from "../services/basebase.service";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listStories() {
  try {
    // Set auth token for BaseBase
    const token = process.env.BASEBASE_TOKEN;
    if (!token) {
      throw new Error("BASEBASE_TOKEN environment variable is required");
    }
    console.log("Using token:", token.substring(0, 10) + "...");
    basebaseService.setToken(token);

    // Get all stories
    const response = await basebaseService.graphql<{
      getNewsStorys: {
        id: string;
        headline: string;
        url: string;
        newsSource: { id: string; name: string };
        createdAt: string;
      }[];
    }>(
      `query GetNewsStorys {
        getNewsStorys {
          id
          headline
          url
          newsSource {
            id
            name
          }
          createdAt
        }
      }`
    );

    const stories = response.getNewsStorys;
    console.log("\nFound", stories.length, "stories:\n");

    // Print each story with its details
    stories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.headline}`);
      console.log(`   URL: ${story.url}`);
      console.log(
        `   Source: ${story.newsSource.name} (${story.newsSource.id})`
      );
      console.log(`   Created: ${new Date(story.createdAt).toLocaleString()}`);
      console.log("");
    });
  } catch (error) {
    console.error("Failed to list stories:", error);
    process.exit(1);
  }
}

// Run the script
listStories();
