import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, initializeApp, getBasebase } from "basebase";

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
      `preferences-${Date.now()}`
    );
    const db = getBasebase(app);

    // Get the current user info from BaseBase token
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId;

    const { denseMode, darkMode } = await req.json();

    // Store preferences in the newswithfriends collection since they're app-specific
    const userRef = doc(db, `users/${userId}`, "newswithfriends");

    const updateData: Record<string, any> = {};
    if (denseMode !== undefined) updateData.denseMode = denseMode;
    if (darkMode !== undefined) updateData.darkMode = darkMode;

    await updateDoc(userRef, updateData);

    // Return the updated user data
    // For now, we'll return a simple response since we don't have the full user object
    return NextResponse.json({
      success: true,
      user: {
        _id: userId,
        denseMode: denseMode !== undefined ? denseMode : false,
        darkMode: darkMode !== undefined ? darkMode : false,
      },
    });
  } catch (error) {
    console.error("[/api/users/me/preferences] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
