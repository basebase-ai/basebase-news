import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import {
  getDatabase,
  doc,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  QueryDocumentSnapshot,
} from "basebase-js";
import type { UserConnection } from "../types";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}

// Create database instance
const db = getDatabase(process.env.BASEBASE_TOKEN!);

interface MongoConnection {
  _id: string;
  firstId: string; // MongoDB user ID (first user)
  secondId: string; // MongoDB user ID (second user)
  status: string; // e.g., "CONNECTED", "REQUESTED", etc.
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoUser {
  _id: string;
  phone?: string;
  email: string;
  first: string;
  last: string;
}

async function connectToMongo(): Promise<{ client: MongoClient; db: any }> {
  console.log("Connecting to MongoDB...");
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  console.log("Connected successfully to MongoDB");
  return { client, db: client.db() };
}

async function buildMongoToBaseBaseUserMapping(): Promise<Map<string, string>> {
  try {
    console.log("Building MongoDB-to-BaseBase user ID mapping...");

    // Get MongoDB users
    const { client: mongoClient, db: mongoDb } = await connectToMongo();
    const mongoUsers = await mongoDb.collection("users").find({}).toArray();

    // Get BaseBase users
    const basebaseUsersCollection = query(collection(db, "basebase/users"));
    const basebaseUsersSnap = await getDocs(basebaseUsersCollection);

    const phoneToBaseBaseId = new Map<string, string>();
    basebaseUsersSnap.forEach((userDoc: QueryDocumentSnapshot) => {
      const userData = userDoc.data() as any;
      if (userData.phone) {
        phoneToBaseBaseId.set(userData.phone, userDoc.id);
      }
    });

    const mongoToBaseBaseMap = new Map<string, string>();
    for (const mongoUser of mongoUsers) {
      if (mongoUser.phone && phoneToBaseBaseId.has(mongoUser.phone)) {
        const baseBaseId = phoneToBaseBaseId.get(mongoUser.phone)!;
        mongoToBaseBaseMap.set(mongoUser._id.toString(), baseBaseId);
      }
    }

    console.log(
      `📊 Mapped ${mongoToBaseBaseMap.size} MongoDB users to BaseBase users`
    );
    await mongoClient.close();
    return mongoToBaseBaseMap;
  } catch (error) {
    console.error("Error building user mapping:", error);
    return new Map();
  }
}

async function migrateConnectionsFromMongo() {
  console.log("\n🔄 MIGRATING CONNECTIONS FROM MONGODB");
  console.log("=====================================");

  let mongoClient: MongoClient | undefined;

  try {
    // Build user ID mapping
    const userIdMap = await buildMongoToBaseBaseUserMapping();
    if (userIdMap.size === 0) {
      console.log("❌ No user mappings found. Cannot migrate connections.");
      return;
    }

    // Connect to MongoDB and get connections
    console.log("\n📥 Fetching connections from MongoDB...");
    const { client, db: mongoDb } = await connectToMongo();
    mongoClient = client;

    const rawConnections = await mongoDb
      .collection("connections")
      .find({})
      .toArray();
    const connections: MongoConnection[] = rawConnections.map((conn: any) => ({
      _id: conn._id.toString(),
      firstId: conn.firstId ? conn.firstId.toString() : conn.firstId,
      secondId: conn.secondId ? conn.secondId.toString() : conn.secondId,
      status: conn.status || "CONNECTED",
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    console.log(`Found ${connections.length} connections to migrate`);

    // Debug: Log first few connections to see what we're getting
    console.log("\n🔍 Sample connections after processing:");
    connections.slice(0, 3).forEach((conn, index) => {
      console.log(
        `Connection ${index + 1}: ${conn.firstId} <-> ${conn.secondId} (${conn.status})`
      );
    });

    let totalConnections = 0;
    let skippedConnections = 0;
    let errorCount = 0;
    let unmappedUsers = 0;

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(
          `\n🔗 Processing connection: ${connection.firstId} <-> ${connection.secondId} (${connection.status})`
        );

        // Map MongoDB user IDs to BaseBase user IDs
        const baseBaseUser1Id = userIdMap.get(connection.firstId);
        const baseBaseUser2Id = userIdMap.get(connection.secondId);

        if (!baseBaseUser1Id || !baseBaseUser2Id) {
          console.log(
            `  ⚠️  Skipping - unmapped users: ${!baseBaseUser1Id ? connection.firstId : ""} ${!baseBaseUser2Id ? connection.secondId : ""}`
          );
          unmappedUsers++;
          continue;
        }

        // Only migrate "CONNECTED" relationships as mutual friends
        if (connection.status !== "CONNECTED") {
          console.log(
            `  ⏭️  Skipping non-connected relationship: ${connection.status}`
          );
          skippedConnections++;
          continue;
        }

        // Create bidirectional friend connections (both directions)
        const connections_to_create = [
          {
            from: baseBaseUser1Id,
            to: baseBaseUser2Id,
            type: "friend" as const,
            createdAt:
              connection.createdAt?.toISOString() || new Date().toISOString(),
            metadata: {
              app: "newswithfriends",
              migratedFrom: "mongo_connections",
              mongoConnectionId: connection._id,
            },
          },
          {
            from: baseBaseUser2Id,
            to: baseBaseUser1Id,
            type: "friend" as const,
            createdAt:
              connection.createdAt?.toISOString() || new Date().toISOString(),
            metadata: {
              app: "newswithfriends",
              migratedFrom: "mongo_connections",
              mongoConnectionId: connection._id,
            },
          },
        ];

        for (const connectionData of connections_to_create) {
          // Check if connection already exists
          const existingQuery = query(
            collection(db, "public/user_connections"),
            where("from", "==", connectionData.from),
            where("to", "==", connectionData.to),
            where("type", "==", "friend")
          );
          const existing = await getDocs(existingQuery);

          if (existing.docs.length > 0) {
            console.log(
              `    ⏭️  Connection ${connectionData.from} -> ${connectionData.to} already exists`
            );
            continue;
          }

          // Create new connection
          await addDoc(
            collection(db, "public/user_connections"),
            connectionData
          );
          console.log(
            `    ✅ Created connection ${connectionData.from} -> ${connectionData.to}`
          );
          totalConnections++;
        }
      } catch (error) {
        console.error(
          `  ❌ Failed to migrate connection ${connection._id}:`,
          error
        );
        errorCount++;
      }
    }

    console.log("\n🏁 MIGRATION SUMMARY:");
    console.log(`📊 Total MongoDB connections found: ${connections.length}`);
    console.log(`✅ BaseBase connections created: ${totalConnections}`);
    console.log(`⏭️  Skipped (non-connected status): ${skippedConnections}`);
    console.log(`⚠️  Skipped (unmapped users): ${unmappedUsers}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (totalConnections > 0) {
      console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
      console.log("📝 Next steps:");
      console.log("  1. Test the friends functionality in your app");
      console.log("  2. Check friend suggestions and requests");
      console.log("  3. Verify the cross-app social graph works");
    } else {
      console.log("\n✨ No new connections needed to be created");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log("Closed MongoDB connection");
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateConnectionsFromMongo()
    .then(() => {
      console.log("\n✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateConnectionsFromMongo;
