import { MongoClient, ObjectId } from "mongodb";

let client: MongoClient | null = null;

export const connectToEdgeDatabase = async () => {
  if (client) {
    return client;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  client = new MongoClient(uri);
  await client.connect();
  return client;
};

interface MongoDBDocument {
  _id: string;
  [key: string]: any;
}

export async function getUserById(
  userId: string
): Promise<MongoDBDocument | null> {
  const { MONGODB_DATA_API_URL, MONGODB_DATA_API_KEY } = process.env;

  if (!MONGODB_DATA_API_URL || !MONGODB_DATA_API_KEY) {
    throw new Error("MongoDB Data API configuration is missing");
  }

  try {
    const response = await fetch(`${MONGODB_DATA_API_URL}/action/findOne`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MONGODB_DATA_API_KEY,
      },
      body: JSON.stringify({
        dataSource: "Cluster0",
        database: "storylist",
        collection: "users",
        filter: { _id: { $oid: userId } },
      }),
    });

    if (!response.ok) {
      throw new Error(`MongoDB Data API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.document;
  } catch (error) {
    console.error("[MongoDB Edge] Error fetching user:", error);
    throw error;
  }
}
