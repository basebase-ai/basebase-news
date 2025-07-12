import { sourceService } from "../services/source.service";
// Note: basebaseService is no longer needed as services handle their own database connections
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("Starting source mapping script...");

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}

console.log("Environment variables loaded");

// BaseBase authentication is now handled automatically via API key
console.log("BaseBase service initialized");

interface MongoSource {
  _id: string;
  name: string;
  homepageUrl?: string;
  rssUrl?: string;
  lastScrapedAt?: Date;
}

interface BaseBaseSource {
  id?: string;
  name: string;
  homepageUrl?: string;
  rssUrl?: string;
  lastScrapedAt?: string;
}

interface SourceMapping {
  mongoId: string;
  basebaseId: string;
  name: string;
  homepageUrl: string;
}

async function connectToMongo(): Promise<{ client: MongoClient; db: any }> {
  console.log("Attempting to connect to MongoDB...");
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  console.log("Connected successfully to MongoDB");
  const db = client.db();
  console.log("Database selected:", db.databaseName);
  return { client, db };
}

async function buildSourceMapping(): Promise<void> {
  let mongoClient: MongoClient | undefined;

  try {
    // Step 1: Get all sources from BaseBase
    console.log("\nStep 1: Fetching sources from BaseBase");
    const allBasebaseSources = await sourceService.getSources();
    const basebaseSources: BaseBaseSource[] = allBasebaseSources.filter(
      (source) => source.id
    ) as BaseBaseSource[];
    console.log(
      `Found ${basebaseSources.length} sources in BaseBase with valid IDs`
    );

    // Step 2: Get all sources from MongoDB
    console.log("\nStep 2: Fetching sources from MongoDB");
    const { client, db } = await connectToMongo();
    mongoClient = client;

    const mongoSources: MongoSource[] = await db
      .collection("sources")
      .find({})
      .toArray();
    console.log(`Found ${mongoSources.length} sources in MongoDB`);

    // Step 3: Build mapping based on homepageUrl
    console.log("\nStep 3: Building mapping based on homepageUrl");
    const mapping: SourceMapping[] = [];
    const unmatchedMongo: MongoSource[] = [];
    const unmatchedBasebase: BaseBaseSource[] = [...basebaseSources];

    for (const mongoSource of mongoSources) {
      if (!mongoSource.homepageUrl) {
        console.log(
          `⚠️  MongoDB source "${mongoSource.name}" has no homepageUrl, skipping`
        );
        unmatchedMongo.push(mongoSource);
        continue;
      }

      // Normalize URLs for comparison (remove trailing slashes, convert to lowercase)
      const normalizeUrl = (url: string) =>
        url.trim().toLowerCase().replace(/\/+$/, "");
      const mongoUrl = normalizeUrl(mongoSource.homepageUrl);

      // Find matching BaseBase source
      const matchingBasebaseIndex = unmatchedBasebase.findIndex((bbSource) => {
        if (!bbSource.homepageUrl) return false;
        const bbUrl = normalizeUrl(bbSource.homepageUrl);
        return bbUrl === mongoUrl;
      });

      if (matchingBasebaseIndex !== -1) {
        const matchingBasebase = unmatchedBasebase[matchingBasebaseIndex];
        if (matchingBasebase.id) {
          mapping.push({
            mongoId: mongoSource._id.toString(),
            basebaseId: matchingBasebase.id,
            name: mongoSource.name,
            homepageUrl: mongoSource.homepageUrl,
          });
          console.log(
            `✓ Mapped: ${mongoSource.name} (${mongoSource._id}) -> ${matchingBasebase.id}`
          );

          // Remove from unmatched list
          unmatchedBasebase.splice(matchingBasebaseIndex, 1);
        }
      } else {
        console.log(
          `✗ No match found for MongoDB source: ${mongoSource.name} (${mongoUrl})`
        );
        unmatchedMongo.push(mongoSource);
      }
    }

    // Step 4: Report results
    console.log("\n=== MAPPING RESULTS ===");
    console.log(`✅ Successfully mapped: ${mapping.length} sources`);
    console.log(`❌ Unmatched MongoDB sources: ${unmatchedMongo.length}`);
    console.log(`❌ Unmatched BaseBase sources: ${unmatchedBasebase.length}`);

    if (unmatchedMongo.length > 0) {
      console.log("\n📋 Unmatched MongoDB sources:");
      unmatchedMongo.forEach((source) => {
        console.log(
          `  - ${source.name} (${source._id}) - ${source.homepageUrl || "NO URL"}`
        );
      });
    }

    if (unmatchedBasebase.length > 0) {
      console.log("\n📋 Unmatched BaseBase sources:");
      unmatchedBasebase.forEach((source) => {
        console.log(
          `  - ${source.name} (${source.id}) - ${source.homepageUrl || "NO URL"}`
        );
      });
    }

    // Step 5: Save mapping to file
    const mappingFile = "source-id-mapping.json";
    console.log(`\n💾 Saving mapping to ${mappingFile}`);

    const mappingData = {
      generatedAt: new Date().toISOString(),
      totalMapped: mapping.length,
      totalUnmatchedMongo: unmatchedMongo.length,
      totalUnmatchedBasebase: unmatchedBasebase.length,
      mapping: mapping.reduce(
        (acc, item) => {
          acc[item.mongoId] = item.basebaseId;
          return acc;
        },
        {} as Record<string, string>
      ),
      details: {
        mapped: mapping,
        unmatchedMongo,
        unmatchedBasebase,
      },
    };

    fs.writeFileSync(mappingFile, JSON.stringify(mappingData, null, 2));
    console.log(`✅ Mapping saved to ${mappingFile}`);

    // Step 6: Show sample usage
    console.log("\n📖 Sample usage in migration script:");
    console.log(
      `const mapping = JSON.parse(fs.readFileSync('${mappingFile}', 'utf8')).mapping;`
    );
    console.log(`const basebaseSourceId = mapping[mongoSourceId];`);
  } catch (error) {
    console.error("\nMapping failed:", error);
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

// Run the mapping
console.log("Starting source mapping process...");
buildSourceMapping();
