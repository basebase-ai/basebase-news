import { sourceService } from "../services/source.service";
import { basebaseService } from "../services/basebase.service";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}

// Set up BaseBase authentication
basebaseService.setToken(process.env.BASEBASE_TOKEN);

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
    const { client, db } = await connectToMongo();
    mongoClient = client;
    const rawSources = await db.collection("sources").find({}).toArray();
    const sources: MongoSource[] = rawSources.map((source: any) => ({
      _id: source._id.toString(),
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
    }));

    console.log(`Found ${sources.length} sources to migrate`);

    for (const source of sources) {
      try {
        console.log(`\nMigrating source: ${source.name}`);

        // Map MongoDB fields to BaseBase fields
        const basebaseSource = {
          name: source.name,
          homepageUrl: source.homepageUrl,
          rssUrl: source.rssUrl,
          lastScrapedAt: source.lastScrapedAt,
          imageUrl: source.imageUrl,
        };

        await sourceService.addSource(basebaseSource);
        console.log(`✓ Successfully migrated ${source.name}`);
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
migrateSources();
