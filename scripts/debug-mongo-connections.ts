import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

async function connectToMongo(): Promise<{ client: MongoClient; db: any }> {
  console.log("Connecting to MongoDB...");
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  console.log("Connected successfully to MongoDB");
  return { client, db: client.db() };
}

async function debugMongoConnections() {
  console.log("\n🔍 DEBUGGING MONGODB CONNECTIONS STRUCTURE");
  console.log("==========================================");

  let mongoClient: MongoClient | undefined;

  try {
    // Connect to MongoDB
    const { client, db: mongoDb } = await connectToMongo();
    mongoClient = client;

    // Get sample connections
    console.log("\n📊 Examining connections collection...");
    const connectionsCount = await mongoDb
      .collection("connections")
      .countDocuments();
    console.log(`Total connections found: ${connectionsCount}`);

    if (connectionsCount === 0) {
      console.log("❌ No connections found in database");
      return;
    }

    // Get first few connections to examine structure
    const sampleConnections = await mongoDb
      .collection("connections")
      .find({})
      .limit(3)
      .toArray();

    console.log("\n📋 Sample connection documents:");
    sampleConnections.forEach((conn: any, index: number) => {
      console.log(`\n--- Connection ${index + 1} ---`);
      console.log("Raw document:", JSON.stringify(conn, null, 2));
      console.log("Available fields:", Object.keys(conn));
    });

    // Also examine users collection to see structure
    console.log("\n👥 Examining users collection...");
    const usersCount = await mongoDb.collection("users").countDocuments();
    console.log(`Total users found: ${usersCount}`);

    if (usersCount > 0) {
      const sampleUsers = await mongoDb
        .collection("users")
        .find({})
        .limit(2)
        .toArray();
      console.log("\n📋 Sample user documents:");
      sampleUsers.forEach((user: any, index: number) => {
        console.log(`\n--- User ${index + 1} ---`);
        console.log("_id:", user._id);
        console.log("phone:", user.phone);
        console.log("email:", user.email);
        console.log("first:", user.first);
        console.log("last:", user.last);
        console.log("Available fields:", Object.keys(user));
      });
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log("\nClosed MongoDB connection");
    }
  }
}

// Run the debug
if (require.main === module) {
  debugMongoConnections()
    .then(() => {
      console.log("\n✅ Debug completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Debug failed:", error);
      process.exit(1);
    });
}

export default debugMongoConnections;
