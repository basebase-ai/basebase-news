import { storyService } from "../services/story.service";
import { basebaseService } from "../services/basebase.service";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

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
basebaseService.setToken(process.env.BASEBASE_TOKEN);
console.log("BaseBase token set");

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

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const progress = (((i + 1) / stories.length) * 100).toFixed(1);

      try {
        if (!story.sourceId) {
          console.log(
            `[${progress}%] ✗ Skipping story "${story.fullHeadline}" - no sourceId`
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

        console.log(`\n[${progress}%] Migrating story: ${story.fullHeadline}`);
        console.log(`  Source ID: ${story.sourceId}`);
        console.log(`  URL: ${story.articleUrl}`);
        console.log(`  Created: ${story.createdAt?.toISOString()}`);

        // Map MongoDB fields to BaseBase fields
        const basebaseStory = {
          headline: story.fullHeadline,
          summary: story.summary || "No summary available",
          url: story.articleUrl,
          imageUrl: story.imageUrl || "https://via.placeholder.com/300",
          newsSource: story.sourceId.toString(),
          creator: {
            id: "system",
            name: "Migration System",
          },
          createdAt: story.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: story.updatedAt?.toISOString() || new Date().toISOString(),
        };

        await storyService.addStory(story.sourceId.toString(), basebaseStory);
        console.log(
          `[${progress}%] ✓ Successfully migrated "${story.fullHeadline}"`
        );
        successCount++;
      } catch (error) {
        console.error(
          `[${progress}%] ✗ Failed to migrate "${story.fullHeadline}":`,
          error
        );
        errorCount++;
      }
    }

    console.log("\nMigration Summary:");
    console.log(`Total stories found: ${stories.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);
    console.log(`Failed: ${errorCount}`);
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
