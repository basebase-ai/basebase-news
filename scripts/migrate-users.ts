// Note: basebaseService is no longer needed as services handle their own database connections
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import * as fs from "fs";
import { addDoc, getDocs, updateDoc, collection, doc } from "basebase";
import { db } from "../services/basebase.service";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("Starting user migration script...");

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.BASEBASE_TOKEN) {
  throw new Error("BASEBASE_TOKEN environment variable is required");
}

console.log("Environment variables loaded");

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

interface MongoUser {
  _id: string;
  first: string;
  last: string;
  phone?: string;
  imageUrl?: string;
  email: string;
  isAdmin: boolean;
  sourceIds: string[];
  denseMode: boolean;
  darkMode: boolean;
}

interface BaseBaseUser {
  id: string;
  data: {
    name: string;
    phone: string;
    email?: string;
    imageUrl?: string;
    sourceIds?: string[];
    friends?: string[];
  };
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

async function findUserByPhone(phone: string): Promise<BaseBaseUser | null> {
  try {
    const usersCollection = collection(db, "users");
    const usersSnap = await getDocs(usersCollection);

    let foundUser: BaseBaseUser | null = null;
    usersSnap.forEach((userDoc) => {
      const userData = userDoc.data() as any;
      if (userData.phone === phone) {
        foundUser = { id: userDoc.id, data: userData };
      }
    });

    return foundUser;
  } catch (error) {
    console.error(`Error finding user by phone ${phone}:`, error);
    return null;
  }
}

async function createUser(userData: {
  name: string;
  phone: string;
  email?: string;
  imageUrl?: string;
  sourceIds?: string[];
}): Promise<BaseBaseUser> {
  try {
    const usersCollection = collection(db, "users");
    const docRef = await addDoc(usersCollection, userData);

    return {
      id: docRef.id,
      data: userData as any,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

async function updateUser(
  userId: string,
  userData: any
): Promise<BaseBaseUser> {
  try {
    const userRef = doc(db, `users/${userId}`);
    await updateDoc(userRef, userData);

    return {
      id: userId,
      data: userData as any,
    };
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

async function migrateUsers() {
  let mongoClient: MongoClient | undefined;

  try {
    // Connect to MongoDB and get users
    console.log("\nStep 1: Connecting to MongoDB");
    const { client, db } = await connectToMongo();
    mongoClient = client;

    console.log("\nStep 2: Fetching users from MongoDB");
    const rawUsers = await db.collection("users").find({}).toArray();
    const users: MongoUser[] = rawUsers;

    console.log(`Found ${users.length} users to migrate`);

    console.log("\nStep 3: Starting user migration");
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    console.log(`📊 Migration Progress: Processing ${users.length} users...`);
    console.log(
      `🗂️  Source mapping loaded with ${Object.keys(sourceIdMapping).length} entries`
    );

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = (((i + 1) / users.length) * 100).toFixed(1);

      // Show progress every 10 users
      if (i > 0 && i % 10 === 0) {
        console.log(
          `\n📈 Progress Update [${progress}%]: ${successCount} success, ${skipCount} skipped, ${errorCount} failed, ${createdCount} created, ${updatedCount} updated`
        );
      }

      try {
        if (!user.phone) {
          console.log(
            `[${progress}%] ✗ Skipping user "${user.first} ${user.last}" - no phone number`
          );
          skipCount++;
          continue;
        }

        if (!user.sourceIds || user.sourceIds.length === 0) {
          console.log(
            `[${progress}%] ⚠️  User "${user.first} ${user.last}" has no sourceIds - will create/update without sources`
          );
        }

        console.log(
          `\n[${progress}%] 🔄 Processing user: ${user.first} ${user.last}`
        );
        console.log(`  📱 Phone: ${user.phone}`);
        console.log(`  📧 Email: ${user.email}`);
        console.log(`  📊 MongoDB Source IDs: ${user.sourceIds?.length || 0}`);

        // Map MongoDB source IDs to BaseBase source IDs
        const mappedSourceIds: string[] = [];
        if (user.sourceIds && user.sourceIds.length > 0) {
          for (const mongoSourceId of user.sourceIds) {
            const mongoSourceIdStr = mongoSourceId.toString();
            const basebaseSourceId = sourceIdMapping[mongoSourceIdStr];
            if (basebaseSourceId) {
              mappedSourceIds.push(basebaseSourceId);
            } else {
              console.log(
                `  ⚠️  No BaseBase mapping for MongoDB source ID: ${mongoSourceIdStr}`
              );
            }
          }
        }

        console.log(
          `  🎯 Mapped BaseBase Source IDs: ${mappedSourceIds.length}`
        );

        // Check if user exists in BaseBase
        const existingUser = await findUserByPhone(user.phone);

        const userData = {
          name: `${user.first} ${user.last}`,
          phone: user.phone,
          email: user.email,
          imageUrl: user.imageUrl || undefined,
          sourceIds: mappedSourceIds,
          friends: [], // Initialize empty friends array
        };

        if (existingUser) {
          console.log(
            `  🔄 User exists in BaseBase (ID: ${existingUser.id}) - updating`
          );

          // Update existing user with new sourceIds
          const updatedUser = await updateUser(existingUser.id, userData);
          console.log(
            `  ✅ Successfully updated user "${user.first} ${user.last}"`
          );
          updatedCount++;
        } else {
          console.log(`  ➕ User not found in BaseBase - creating new user`);

          // Create new user
          const newUser = await createUser(userData);
          console.log(
            `  ✅ Successfully created user "${user.first} ${user.last}" (ID: ${newUser.id})`
          );
          createdCount++;
        }

        successCount++;
      } catch (error: any) {
        console.error(
          `[${progress}%] ❌ Failed to migrate user "${user.first} ${user.last}"`
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
    console.log(`📊 Total users found: ${users.length}`);
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`➕ Created new users: ${createdCount}`);
    console.log(`🔄 Updated existing users: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(
      `📈 Success rate: ${((successCount / users.length) * 100).toFixed(1)}%`
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
migrateUsers();
