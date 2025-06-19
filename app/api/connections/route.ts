import { NextRequest, NextResponse } from "next/server";
import { edgeAuthService } from "@/services/auth.edge.service";
import { ConnectionService } from "@/services/connection.service";
import mongoose from "mongoose";
import { connectToDatabase } from "@/services/mongodb.service";

export async function GET(request: NextRequest) {
  try {
    console.log("[/api/connections] GET request received");

    await connectToDatabase();
    console.log("[/api/connections] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(request);
    console.log("[/api/connections] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/connections] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/connections] Verifying token...");
    const { userId: authUserId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/connections] Token verified, userId:", authUserId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    console.log("[/api/connections] Request params:", {
      userId: authUserId,
      status,
    });

    let connections;

    if (status === "REQUESTED") {
      console.log("[/api/connections] Getting requested connections");
      connections = await ConnectionService.getRequests(
        new mongoose.Types.ObjectId(authUserId)
      );
    } else if (status === "SUGGESTED") {
      console.log("[/api/connections] Getting suggested connections");
      connections = await ConnectionService.getSuggestedUsers(
        new mongoose.Types.ObjectId(authUserId)
      );
    } else {
      console.log("[/api/connections] Getting connected users (default)");
      // Default to getting connected users
      connections = await ConnectionService.getConnectedUsers(
        new mongoose.Types.ObjectId(authUserId)
      );
    }

    console.log("[/api/connections] Success, returning connections:", {
      count: connections?.length || 0,
    });

    return NextResponse.json({ status: "ok", connections });
  } catch (error) {
    console.error("[/api/connections] Error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/connections] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[/api/connections] POST request received");

    const token = edgeAuthService.extractTokenFromRequest(request);
    console.log("[/api/connections] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/connections] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/connections] Verifying token...");
    const { userId: authUserId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/connections] Token verified, userId:", authUserId);

    const { targetUserId } = await request.json();
    console.log("[/api/connections] Request body:", { targetUserId });

    if (!targetUserId) {
      console.error("[/api/connections] Missing targetUserId");
      return NextResponse.json(
        { status: "error", message: "Target user ID is required" },
        { status: 400 }
      );
    }

    console.log("[/api/connections] Adding connection...");
    const connection = await ConnectionService.addConnection(
      new mongoose.Types.ObjectId(authUserId),
      new mongoose.Types.ObjectId(targetUserId)
    );

    console.log("[/api/connections] Connection added successfully");
    return NextResponse.json({ status: "ok", connection });
  } catch (error) {
    console.error("[/api/connections] Error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/connections] Invalid token error");
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
