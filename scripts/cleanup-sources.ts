import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/user.model";
import { Source } from "../src/models/source.model";

async function cleanupUserSources(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    const validSources = await Source.find({}, "_id").lean();
    const validSourceIdSet = new Set(
      validSources.map((source) =>
        (source._id as mongoose.Types.ObjectId).toString()
      )
    );
    console.log(`Found ${validSourceIdSet.size} valid sources`);

    let totalRemoved = 0;
    let usersUpdated = 0;

    for (const user of users) {
      const originalCount = user.sourceIds.length;
      const filteredSourceIds = user.sourceIds.filter((id) =>
        validSourceIdSet.has(id.toString())
      );
      const removedCount = originalCount - filteredSourceIds.length;

      if (removedCount > 0) {
        user.sourceIds = filteredSourceIds;
        await user.save();
        totalRemoved += removedCount;
        usersUpdated++;
        console.log(
          `User ${user.email}: Removed ${removedCount} invalid sources`
        );
      }
    }

    console.log("\nCleanup Summary:");
    console.log(`Total users processed: ${users.length}`);
    console.log(`Users updated: ${usersUpdated}`);
    console.log(`Total invalid sources removed: ${totalRemoved}`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

cleanupUserSources();
