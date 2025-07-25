import * as dotenv from "dotenv";
import * as path from "path";
import { getDatabase, doc, setDoc } from "basebase-js";

// Load environment variables from .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Debug: Check if environment variables are loaded
console.log("Environment variables loaded:");
console.log("BASEBASE_TOKEN:", !!process.env.BASEBASE_TOKEN);
console.log("BASEBASE_PROJECT:", !!process.env.BASEBASE_PROJECT);
console.log("BASEBASE_PROJECT_ID:", !!process.env.BASEBASE_PROJECT_ID);

// Check required environment variables
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

interface ProjectAdmin {
  role: "admin" | "super_admin";
  createdAt: string;
  addedBy: string;
}

async function setupAdmin() {
  console.log("\n🚀 SETTING UP PROJECT ADMIN");
  console.log("===========================");

  try {
    const userId = "teg";
    const adminData: ProjectAdmin = {
      role: "admin",
      createdAt: new Date().toISOString(),
      addedBy: "teg",
    };

    console.log(`📝 Creating admin document for user: ${userId}`);
    console.log(`📄 Admin data:`, adminData);

    // Create the admin document
    const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
    await setDoc(adminDoc, adminData);

    console.log(`✅ Successfully created admin document for user: ${userId}`);
    console.log(`📍 Document path: newswithfriends/project_admins/${userId}`);

    console.log("\n🎉 ADMIN SETUP COMPLETE!");
    console.log("========================");
    console.log("You can now use the Settings modal in SourceBox components.");
  } catch (error: any) {
    console.error("❌ Failed to setup admin:");
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run the setup
setupAdmin()
  .then(() => {
    console.log("Setup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
