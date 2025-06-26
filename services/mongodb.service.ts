import mongoose from "mongoose";

// Create a single connection promise
let connectionPromise: Promise<void> | null = null;

const connect = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("[MongoDB] Initializing new connection...");

    // Set up event listeners *before* connecting
    mongoose.connection.on("error", (error: Error) => {
      console.error("[MongoDB] Connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("[MongoDB] Disconnected");
    });

    mongoose.connection.on("connected", () => {
      console.log("[MongoDB] Connected successfully.");
    });

    await mongoose.connect(uri);
  } catch (error) {
    console.error("[MongoDB] Initial connection error:", error);
    // Exit the process if the initial connection fails, as the app is likely unusable
    process.exit(1);
  }
};

export const connectToDatabase = async (): Promise<void> => {
  if (!connectionPromise) {
    connectionPromise = connect();
  }
  await connectionPromise;
  console.log("[MongoDB] Using existing connection or awaiting new one.");
};
