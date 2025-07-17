import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { getDatabase, doc, setDoc } from "basebase-js";

// Load environment variables from .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Suppress BaseBase SDK debug output
process.env.DEBUG = "";

console.log("Starting migration script...");

// Validate environment variables silently

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

// Create database instance with JWT token for server environment
const basebaseDb = getDatabase(process.env.BASEBASE_TOKEN!);

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

async function connectToMongo(): Promise<{ client: MongoClient; mongoDB: Db }> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const mongoDB = client.db("storylist");
  return { client, mongoDB };
}

async function migrateStories(): Promise<void> {
  let mongoClient: MongoClient | undefined;
  const startTime: number = Date.now();

  try {
    // Connect to MongoDB and get stories
    console.log("\nStep 1: Connecting to MongoDB");
    const { client, mongoDB } = await connectToMongo();
    mongoClient = client;

    // Check total count of stories
    const totalCount = await mongoDB.collection("stories").countDocuments();

    if (totalCount === 0) {
      console.log("❌ No stories found in database. Migration cannot proceed.");
      return;
    }

    // Get stories from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    console.log("\nStep 2: Fetching stories from MongoDB");

    // Try different time ranges to find stories
    const timeRanges = [
      { days: 1, label: "24 hours" },
      { days: 7, label: "7 days" },
      { days: 30, label: "30 days" },
      { days: 365, label: "365 days" },
    ];

    let stories: MongoStory[] = [];
    let selectedRange = "";

    for (const range of timeRanges) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - range.days);

      const count = await mongoDB.collection("stories").countDocuments({
        createdAt: { $gte: cutoffDate },
      });

      if (count > 0 && stories.length === 0) {
        // Use the first range that has stories
        const rawStories = await mongoDB
          .collection<MongoStory>("stories")
          .find({
            createdAt: { $gte: cutoffDate },
          })
          .sort({ createdAt: -1 })
          .toArray();

        stories = rawStories;
        selectedRange = range.label;
        break;
      }
    }

    if (stories.length === 0) {
      const rawStories = await mongoDB
        .collection<MongoStory>("stories")
        .find({})
        .sort({ createdAt: -1 })
        .limit(100) // Limit to 100 for safety
        .toArray();

      stories = rawStories;
      selectedRange = "all time (limited to 100)";
    }

    console.log(
      `Found ${stories.length} stories to migrate from last ${selectedRange}`
    );

    if (stories.length === 0) {
      console.log("❌ No stories available for migration.");
      return;
    }

    console.log("\nStep 3: Starting story migration");
    let successCount: number = 0;
    let skipCount: number = 0;
    let errorCount: number = 0;

    console.log(
      `📊 Migration Progress: Processing ${stories.length} stories...`
    );

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const progress = (((i + 1) / stories.length) * 100).toFixed(1);

      // Show progress every 100 stories
      if (i > 0 && i % 100 === 0) {
        console.log(
          `[${progress}%] ${successCount} success, ${skipCount} skipped, ${errorCount} failed`
        );
      }

      try {
        if (!story.sourceId) {
          skipCount++;
          continue;
        }

        if (!story.fullHeadline || !story.articleUrl) {
          skipCount++;
          continue;
        }

        // Map MongoDB fields to BaseBase fields
        const basebaseStory = {
          sourceId: story.sourceId.toString(),
          headline: story.fullHeadline,
          summary: story.summary || "No summary available",
          url: story.articleUrl,
          imageUrl: story.imageUrl,
          section: story.section || null,
          type: story.type || null,
          inPageRank: story.inPageRank || null,
          archived: story.archived || false,
          publishedAt:
            story.createdAt?.toISOString() || new Date().toISOString(),
          createdAt: story.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: story.updatedAt?.toISOString() || new Date().toISOString(),
        };

        // Create story in newsStories collection, preserving MongoDB ObjectId
        const storyRef = doc(
          basebaseDb,
          `newswithfriends/newsStories/${story._id}`
        );
        await setDoc(storyRef, basebaseStory);

        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    console.log(`\n📊 Final Migration Results:`);
    console.log(`✅ Successfully migrated: ${successCount} stories`);
    console.log(`⏭️  Skipped: ${skipCount} stories`);
    console.log(`❌ Failed: ${errorCount} stories`);
    console.log(`📈 Total processed: ${stories.length} stories`);

    // Performance summary
    const totalTime: number = Date.now() - startTime;
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

// Run the migration
migrateStories().then(() => {
  console.log("\n🎉 Migration completed successfully!");
  process.exit(0);
});
