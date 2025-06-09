import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userService } from "@/services/user.service";
import { ConnectionService } from "@/services/connection.service";
import mongoose from "mongoose";
import { connectToDatabase } from "@/services/mongodb.service";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const cookieStore = cookies();
    const token = cookieStore.get("auth")?.value;

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId: authUserId } = userService.verifyToken(token);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    console.log(
      `[API/CONNECTIONS] GET request for userId: ${authUserId}, status: ${status}`
    );

    let connections;

    if (status === "REQUESTED") {
      connections = await ConnectionService.getRequests(
        new mongoose.Types.ObjectId(authUserId)
      );
    } else if (status === "SUGGESTED") {
      connections = await ConnectionService.getSuggestedUsers(
        new mongoose.Types.ObjectId(authUserId)
      );
    } else {
      // Default to getting connected users
      connections = await ConnectionService.getConnectedUsers(
        new mongoose.Types.ObjectId(authUserId)
      );
    }

    return NextResponse.json({ status: "ok", connections });
  } catch (error) {
    console.error("Error getting connections:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth")?.value;

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId: authUserId } = userService.verifyToken(token);
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { status: "error", message: "Target user ID is required" },
        { status: 400 }
      );
    }

    const connection = await ConnectionService.addConnection(
      new mongoose.Types.ObjectId(authUserId),
      new mongoose.Types.ObjectId(targetUserId)
    );

    return NextResponse.json({ status: "ok", connection });
  } catch (error) {
    console.error("Error adding connection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
