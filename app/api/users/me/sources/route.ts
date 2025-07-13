import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, getDoc, initializeApp, getBasebase } from "basebase";

interface BaseBaseUser {
  name: string;
  phone: string;
  email?: string;
  imageUrl?: string;
}

interface NewsWithFriendsUser {
  sourceIds: string[];
  friends: string[];
  denseMode?: boolean;
  darkMode?: boolean;
}

export async function PUT(req: NextRequest) {
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
    // Use unique app name to avoid conflicts with existing app
    const app = initializeApp(
      {
        apiKey: process.env.BASEBASE_API_KEY!,
        token: token,
      },
      `sources-${Date.now()}`
    );
    const db = getBasebase(app);

    // Get the current user info from BaseBase token
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId;

    const { sourceIds } = await req.json();

    if (!Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: "sourceIds must be an array" },
        { status: 400 }
      );
    }

    // Update the user's sourceIds in the newswithfriends collection
    const newsUserRef = doc(db, `users/${userId}`, "newswithfriends");
    await updateDoc(newsUserRef, { sourceIds });

    // Fetch the full user data to return
    const [basebaseUserRef] = [doc(db, `users/${userId}`, "basebase")];

    const [basebaseUserSnap, newsUserSnap] = await Promise.all([
      getDoc(basebaseUserRef),
      getDoc(newsUserRef),
    ]);

    if (!basebaseUserSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const basebaseUser = basebaseUserSnap.data() as BaseBaseUser;
    const newsUser = newsUserSnap.exists
      ? (newsUserSnap.data() as NewsWithFriendsUser)
      : { sourceIds: [], friends: [] };

    // Parse the name into first and last
    const nameParts = basebaseUser.name.split(" ");
    const first = nameParts[0] || "";
    const last = nameParts.slice(1).join(" ") || "";

    // Combine the data into the expected user format
    const user = {
      _id: userId,
      first,
      last,
      phone: basebaseUser.phone,
      email: basebaseUser.email || "",
      imageUrl: basebaseUser.imageUrl,
      isAdmin: false, // Default to false for now
      sourceIds: newsUser.sourceIds || [],
      denseMode: newsUser.denseMode || false,
      darkMode: newsUser.darkMode || false,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[/api/users/me/sources] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
