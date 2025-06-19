import { NextRequest, NextResponse } from "next/server";
import { User, IUser } from "@/models/user.model";
import { connectToDatabase } from "@/services/mongodb.service";
import { Types } from "mongoose";
import { edgeAuthService } from "@/services/auth.edge.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("[/api/users/me] Request received");

    const token = edgeAuthService.extractTokenFromRequest(request);
    console.log("[/api/users/me] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
    });

    if (!token) {
      console.error("[/api/users/me] No token found in request");
      return NextResponse.json(
        { error: "Unauthorized", message: "Bearer token is missing." },
        { status: 401 }
      );
    }

    console.log("[/api/users/me] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/users/me] Token verification result:", {
      hasUserId: !!userId,
      userId: userId ? userId.toString() : null,
    });

    if (!userId) {
      console.error("[/api/users/me] Token verification failed - no userId");
      return NextResponse.json(
        { error: "Unauthorized", message: "Bearer token is invalid." },
        { status: 401 }
      );
    }

    console.log("[/api/users/me] Connecting to database...");
    await connectToDatabase();
    console.log(
      "[/api/users/me] Database connected, finding user by ID:",
      userId
    );

    const user = await User.findById(userId);
    console.log("[/api/users/me] User lookup result:", {
      userFound: !!user,
      userEmail: user?.email || null,
      userName: user ? `${user.first} ${user.last}` : null,
    });

    if (!user) {
      console.error(
        "[/api/users/me] User not found in database for ID:",
        userId
      );
      return NextResponse.json(
        { error: "Not Found", message: "User not found." },
        { status: 404 }
      );
    }

    const responseData = {
      id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      first: user.first,
      last: user.last,
      phone: user.phone,
      imageUrl: user.imageUrl,
      isAdmin: user.isAdmin,
      sourceIds: user.sourceIds.map((id) => id.toString()),
      denseMode: user.denseMode || false,
      darkMode: user.darkMode || false,
    };

    console.log("[/api/users/me] Success - returning user data:", {
      userId: responseData.id,
      email: responseData.email,
      name: `${responseData.first} ${responseData.last}`,
      sourceCount: responseData.sourceIds.length,
    });

    return NextResponse.json({
      status: "ok",
      user: responseData,
    });
  } catch (error) {
    console.error("[/api/users/me] Caught error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/users/me] Invalid token error");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Bearer token is invalid or expired.",
        },
        { status: 401 }
      );
    }
    console.error("[/api/users/me] Server error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
