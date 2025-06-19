import { NextRequest, NextResponse } from "next/server";
import { User, IUser } from "@/models/user.model";
import { connectToDatabase } from "@/services/mongodb.service";
import { Types } from "mongoose";
import { edgeAuthService } from "@/services/auth.edge.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Bearer token is missing." },
        { status: 401 }
      );
    }

    const { userId } = await edgeAuthService.verifyToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Bearer token is invalid." },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "ok",
      user: {
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
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid token")) {
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
