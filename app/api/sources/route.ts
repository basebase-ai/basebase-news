import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  initializeApp,
  getBasebase,
} from "basebase";

export async function GET(req: NextRequest) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Initialize BaseBase with the user's token for authentication
    const app = initializeApp(
      {
        apiKey: process.env.BASEBASE_API_KEY!,
        token: token,
      },
      `sources-api-${Date.now()}`
    );
    const db = getBasebase(app);

    // Get all sources from BaseBase
    const sourcesCollection = collection(db, "newsSources", "newswithfriends");
    const sourcesSnap = await getDocs(sourcesCollection);

    const sources: any[] = [];
    sourcesSnap.forEach((doc) => {
      sources.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[/api/sources] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
