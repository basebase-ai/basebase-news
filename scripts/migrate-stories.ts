import { storyService } from "../services/story.service";
// Note: basebaseService is no longer needed as services handle their own database connections
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("Starting migration script...");

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}

console.log("Environment variables loaded");

// Set up BaseBase authentication
// BaseBase authentication is now handled automatically via API key
console.log("BaseBase token set");

// Load source ID mapping
const mappingFile = "source-id-mapping.json";
if (!fs.existsSync(mappingFile)) {
  throw new Error(
    `Source mapping file ${mappingFile} not found. Please run 'npm run build-source-mapping' first.`
  );
}
const mappingData = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
const sourceIdMapping: Record<string, string> = mappingData.mapping;
console.log(
  `Loaded source mapping with ${Object.keys(sourceIdMapping).length} entries`
);

interface MongoStory {
  _id: string;
  sourceId: string;
  fullHeadline: string;
  summary?: string;
  articleUrl?: string;
  imageUrl?: string;
  section?: string;
  type?: string;
  inPageRank?: number | null;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

async function connectToMongo(): Promise<{ client: MongoClient; db: any }> {
  console.log("Attempting to connect to MongoDB...");
  console.log(
    "Using MongoDB URI:",
    process.env.MONGODB_URI!.replace(
      /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/,
      "mongodb$1://****:****@"
    )
  );
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  console.log("Connected successfully to MongoDB");

  const db = client.db();
  console.log("Database selected:", db.databaseName);
  return { client, db };
}

async function migrateStories() {
  let mongoClient: MongoClient | undefined;

  try {
    // Connect to MongoDB and get stories
    console.log("\nStep 1: Connecting to MongoDB");
    const { client, db } = await connectToMongo();
    mongoClient = client;

    // Get stories from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    console.log("\nStep 2: Fetching stories from MongoDB");
    console.log(`Fetching stories created after: ${oneDayAgo.toISOString()}`);

    const rawStories = await db
      .collection("stories")
      .find({
        createdAt: { $gte: oneDayAgo },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const stories: MongoStory[] = rawStories;

    console.log(
      `Found ${stories.length} stories to migrate from the last 24 hours`
    );

    console.log("\nStep 3: Starting story migration");
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(
      `📊 Migration Progress: Processing ${stories.length} stories...`
    );
    console.log(
      `🗂️  Source mapping loaded with ${Object.keys(sourceIdMapping).length} entries`
    );

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const progress = (((i + 1) / stories.length) * 100).toFixed(1);

      // Show progress every 50 stories
      if (i > 0 && i % 50 === 0) {
        console.log(
          `\n📈 Progress Update [${progress}%]: ${successCount} success, ${skipCount} skipped, ${errorCount} failed`
        );
      }

      try {
        if (!story.sourceId) {
          console.log(
            `[${progress}%] ✗ Skipping story "${story.fullHeadline}" - no sourceId`
          );
          skipCount++;
          continue;
        }

        // Map MongoDB source ID to BaseBase source ID
        const mongoSourceIdStr = story.sourceId.toString();
        const basebaseSourceId = sourceIdMapping[mongoSourceIdStr];
        if (!basebaseSourceId) {
          console.log(
            `[${progress}%] ✗ Skipping story "${story.fullHeadline}" - no BaseBase source mapping for MongoDB ID: ${mongoSourceIdStr}`
          );
          console.log(
            `🔍 Available mappings: ${Object.keys(sourceIdMapping).slice(0, 3).join(", ")}...`
          );
          skipCount++;
          continue;
        }

        if (!story.fullHeadline || !story.articleUrl) {
          console.log(
            `[${progress}%] ✗ Skipping story "${story.fullHeadline || "Unknown"}" - missing required fields`
          );
          skipCount++;
          continue;
        }

        console.log(
          `\n[${progress}%] 🔄 Migrating story: ${story.fullHeadline}`
        );
        console.log(`  📊 MongoDB Source ID: ${story.sourceId}`);
        console.log(`  🎯 BaseBase Source ID: ${basebaseSourceId}`);
        console.log(`  🔗 URL: ${story.articleUrl}`);
        console.log(`  📅 Created: ${story.createdAt?.toISOString()}`);

        // Map MongoDB fields to BaseBase fields
        const basebaseStory = {
          headline: story.fullHeadline,
          summary: story.summary || "No summary available",
          url: story.articleUrl,
          imageUrl: story.imageUrl || "https://via.placeholder.com/300",
          newsSource: basebaseSourceId,
          publishedAt:
            story.createdAt?.toISOString() || new Date().toISOString(),
        };

        console.log(`  📝 Story data prepared:`, {
          headline: basebaseStory.headline.substring(0, 50) + "...",
          summaryLength: basebaseStory.summary.length,
          url: basebaseStory.url,
          imageUrl: basebaseStory.imageUrl.substring(0, 50) + "...",
          newsSource: basebaseStory.newsSource,
          publishedAt: basebaseStory.publishedAt,
        });

        // Create a proper IStory object for the addStory method
        const fullStory = {
          ...basebaseStory,
          creator: {
            id: "system",
            name: "Migration System",
          },
        };

        console.log(`  🚀 Calling storyService.addStory...`);
        await storyService.addStory(basebaseSourceId, fullStory);
        console.log(`  ✅ Story service call completed successfully`);
        console.log(
          `[${progress}%] ✓ Successfully migrated "${story.fullHeadline}"`
        );
        successCount++;
      } catch (error: any) {
        console.error(
          `[${progress}%] ❌ Failed to migrate "${story.fullHeadline}"`
        );
        console.error(`  🔥 Error type: ${error.constructor.name}`);
        console.error(`  💬 Error message: ${error.message}`);
        if (error.response) {
          console.error(`  📡 HTTP Status: ${error.response.status}`);
          console.error(`  📄 Response headers:`, error.response.headers);
        }
        if (error.request) {
          console.error(`  📨 Request details:`, {
            query: error.request.query?.substring(0, 100) + "...",
            variables: error.request.variables,
          });
        }
        console.error(`  📍 Full error:`, error);
        errorCount++;
      }
    }

    console.log("\n🏁 MIGRATION SUMMARY:");
    console.log(`📊 Total stories found: ${stories.length}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(
      `📈 Success rate: ${((successCount / stories.length) * 100).toFixed(1)}%`
    );
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoClient) {
      console.log("\nClosing MongoDB connection");
      await mongoClient.close();
      console.log("MongoDB connection closed");
    }
  }
}

// Run the migration
console.log("Starting migration process...");
migrateStories();
