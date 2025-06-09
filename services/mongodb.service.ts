import mongoose from "mongoose";

let isConnected = false;

export const connectToDatabase = async (): Promise<void> => {
  if (isConnected) {
    console.log("[MongoDB] Using existing connection");
    return;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log(
      "[MongoDB] Connection string (sanitized):",
      uri.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, "$1****:****@")
    );

    await mongoose.connect(uri);

    mongoose.connection.on("error", (error: Error) => {
      console.error("[MongoDB] Connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("[MongoDB] Disconnected");
      isConnected = false;
    });

    isConnected = true;
    console.log("[MongoDB] Connected successfully");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    throw error;
  }
};
