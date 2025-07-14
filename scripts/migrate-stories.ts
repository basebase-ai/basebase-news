import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { doc, setDoc } from "basebase";

// Load environment variables from .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("Starting migration script...");

// Debug: Check if environment variables are loaded
console.log("Environment variables loaded:");
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("BASEBASE_TOKEN:", process.env.BASEBASE_TOKEN);
console.log("BASEBASE_API_KEY:", process.env.BASEBASE_API_KEY);
console.log("BASEBASE_PROJECT_ID:", process.env.BASEBASE_PROJECT_ID);

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}
if (!process.env.BASEBASE_API_KEY) {
  throw new Error("BASEBASE_API_KEY environment variable is required");
}
if (!process.env.BASEBASE_PROJECT_ID) {
  throw new Error("BASEBASE_PROJECT_ID environment variable is required");
}

console.log("Environment variables loaded");

// Debug: Check if token is configured
console.log("BaseBase initialized with token:", !!process.env.BASEBASE_TOKEN);

// Test BaseBase connection by trying to get a document
console.log("Testing BaseBase connection...");
try {
  const testDoc = doc("test/test", "newswithfriends");
  console.log("✓ BaseBase connection test passed");
} catch (error) {
  console.error("✗ BaseBase connection test failed:", error);
}

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
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db("newsWithFriends");
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

        if (!story.fullHeadline || !story.articleUrl) {
          console.log(
            `[${progress}%] ✗ Skipping story "${story.fullHeadline || "Unknown"}" - missing required fields`
          );
          skipCount++;
          continue;
        }

        // console.log(
        //   `\n[${progress}%] 🔄 Migrating story: ${story.fullHeadline}`
        // );
        // console.log(`  📊 Source ID: ${story.sourceId}`);
        // console.log(`  🔗 URL: ${story.articleUrl}`);
        // console.log(`  📅 Created: ${story.createdAt?.toISOString()}`);

        // Map MongoDB fields to BaseBase fields
        const basebaseStory = {
          sourceId: story.sourceId.toString(),
          headline: story.fullHeadline,
          summary: story.summary || "No summary available",
          url: story.articleUrl,
          imageUrl: story.imageUrl || "https://via.placeholder.com/300",
          section: story.section || null,
          type: story.type || null,
          inPageRank: story.inPageRank || null,
          archived: story.archived || false,
          publishedAt:
            story.createdAt?.toISOString() || new Date().toISOString(),
          createdAt: story.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: story.updatedAt?.toISOString() || new Date().toISOString(),
        };

        // console.log(`  📝 Story data prepared:`, {
        //   headline: basebaseStory.headline.substring(0, 50) + "...",
        //   summaryLength: basebaseStory.summary.length,
        //   url: basebaseStory.url,
        //   imageUrl: basebaseStory.imageUrl.substring(0, 50) + "...",
        //   sourceId: basebaseStory.sourceId,
        //   publishedAt: basebaseStory.publishedAt,
        // });

        // Create story in newsStories collection, preserving MongoDB ObjectId
        const storyRef = doc(`newsStories/${story._id}`);
        await setDoc(storyRef, basebaseStory);
        // console.log(`  ✅ Story created successfully`);
        // console.log(
        //   `[${progress}%] ✓ Successfully migrated "${story.fullHeadline}"`
        // );

        successCount++;
      } catch (error) {
        console.error(
          `[${progress}%] ✗ Error migrating story "${story.fullHeadline}":`,
          error
        );
        errorCount++;
      }
    }

    console.log(`\n📊 Final Migration Results:`);
    console.log(`✅ Successfully migrated: ${successCount} stories`);
    console.log(`⏭️  Skipped: ${skipCount} stories`);
    console.log(`❌ Failed: ${errorCount} stories`);
    console.log(`📈 Total processed: ${stories.length} stories`);

    // Performance summary
    const totalTime = Date.now() - (global as any).startTime;
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(
      `⚡ Average: ${(totalTime / stories.length).toFixed(2)}ms per story`
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Set start time for performance tracking
(global as any).startTime = Date.now();

// Run the migration
migrateStories().then(() => {
  console.log("\n🎉 Migration completed successfully!");
  process.exit(0);
});
