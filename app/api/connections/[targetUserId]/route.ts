import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userService } from "@/services/user.service";
import { ConnectionService } from "@/services/connection.service";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: { targetUserId: string } }
) {
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
    const { targetUserId } = params;

    const connection = await ConnectionService.getConnection(
      new mongoose.Types.ObjectId(authUserId),
      new mongoose.Types.ObjectId(targetUserId)
    );

    if (!connection) {
      return NextResponse.json(
        { status: "error", message: "Connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", connection });
  } catch (error) {
    console.error("Error getting connection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { targetUserId: string } }
) {
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
    const { targetUserId } = params;

    const connection = await ConnectionService.removeConnection(
      new mongoose.Types.ObjectId(authUserId),
      new mongoose.Types.ObjectId(targetUserId)
    );

    if (!connection) {
      return NextResponse.json(
        { status: "error", message: "Connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", connection });
  } catch (error) {
    console.error("Error removing connection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
