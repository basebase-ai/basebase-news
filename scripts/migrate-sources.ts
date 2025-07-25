import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { getDatabase, doc, setDoc } from "basebase-js";

// Load environment variables from .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Debug: Check if environment variables are loaded
console.log("Environment variables loaded:");
console.log("MONGODB_URI:", !!process.env.MONGODB_URI);
console.log("BASEBASE_TOKEN:", !!process.env.BASEBASE_TOKEN);
console.log("BASEBASE_PROJECT:", !!process.env.BASEBASE_PROJECT);
console.log("BASEBASE_PROJECT_ID:", !!process.env.BASEBASE_PROJECT_ID);

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}
if (!process.env.BASEBASE_PROJECT) {
  throw new Error("BASEBASE_PROJECT environment variable is required");
}
if (!process.env.BASEBASE_PROJECT_ID) {
  throw new Error("BASEBASE_PROJECT_ID environment variable is required");
}

// Create database instance with JWT token for server environment
const db = getDatabase(process.env.BASEBASE_TOKEN!);

// Debug: Check if token is configured
console.log("BaseBase initialized with token:", !!process.env.BASEBASE_TOKEN);

interface MongoSource {
  _id: string;
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  includeSelector?: string | null;
  excludeSelector?: string | null;
  biasScore?: number | null;
  tags?: string[];
  imageUrl?: string;
  lastScrapedAt?: string;
  hasPaywall?: boolean;
}

async function connectToMongo(): Promise<{ client: MongoClient; db: any }> {
  console.log("Connecting to MongoDB...");
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  console.log("Connected successfully to MongoDB");

  return { client, db: client.db() };
}

async function migrateSources() {
  let mongoClient: MongoClient | undefined;

  try {
    // Connect to MongoDB and get sources
    const { client, db: mongoDB } = await connectToMongo();
    mongoClient = client;
    const rawSources = await mongoDB.collection("sources").find({}).toArray();
    const sources: MongoSource[] = rawSources
      .map((source: any) => ({
        _id: source._id
          ? source._id.toString()
          : source.id
            ? source.id.toString()
            : undefined,
        name: source.name as string,
        homepageUrl: source.homepageUrl as string,
        rssUrl: source.rssUrl as string | undefined,
        includeSelector: source.includeSelector as string | null | undefined,
        excludeSelector: source.excludeSelector as string | null | undefined,
        biasScore: source.biasScore as number | null | undefined,
        tags: source.tags as string[] | undefined,
        imageUrl: source.imageUrl as string | undefined,
        lastScrapedAt: source.lastScrapedAt as string | undefined,
        hasPaywall: source.hasPaywall as boolean | undefined,
      }))
      .filter((source: any) => source._id); // Filter out sources without valid IDs

    console.log(`\nFound ${sources.length} sources to migrate`);

    for (const source of sources) {
      try {
        console.log(`\nMigrating source: ${source.name}`);

        // Map MongoDB fields to BaseBase fields
        const basebaseSource = {
          name: source.name,
          homepageUrl: source.homepageUrl,
          rssUrl: source.rssUrl,
          lastScrapedAt: source.lastScrapedAt || new Date().toISOString(),
          imageUrl: source.imageUrl,
        };

        // Add to BaseBase directly using the original MongoDB ID
        const sourceDoc = doc(db, `newswithfriends/news_sources/${source._id}`);
        await setDoc(sourceDoc, basebaseSource);
        console.log(
          `✓ Successfully migrated ${source.name} with ID: ${source._id}`
        );
      } catch (error) {
        console.error(`✗ Failed to migrate ${source.name}:`, error);
      }
    }

    console.log("\nMigration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoClient) {
      await mongoClient.close();
      console.log("Closed MongoDB connection");
    }
  }
}

// Run the migration
console.log("Starting migration process...");
migrateSources();
