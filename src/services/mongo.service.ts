import mongoose from "mongoose";
import dotenv from "dotenv";
import { networkInterfaces } from "os";

try {
  dotenv.config();
} catch (error) {
  console.log("No .env file found - using environment variables directly");
}

export const connectDB = async (): Promise<void> => {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("Node version:", process.version);
    console.log("Mongoose version:", mongoose.version);

    // Get local IP address
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log("Local IP address:", net.address);
          break;
        }
      }
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log(
      "Connection string (sanitized):",
      uri.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, "$1****:****@")
    );

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      family: 4, // Force IPv4
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    console.error("Please check:");
    console.error("1. Your IP is whitelisted in MongoDB Atlas");
    console.error("2. Your username and password are correct");
    console.error("3. Your cluster is running");
    process.exit(1);
  }
};

export const getCollection = <T extends mongoose.Document>(
  collectionName: string
): mongoose.Collection<T> => {
  return mongoose.connection.collection<T>(collectionName);
};

mongoose.connection.on("error", (error: Error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});
