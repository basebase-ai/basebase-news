import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import mongoose from "mongoose";

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth")?.value;

    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const { denseMode, darkMode } = await request.json();

    if (typeof denseMode === "boolean") {
      user.denseMode = denseMode;
    }
    if (typeof darkMode === "boolean") {
      user.darkMode = darkMode;
    }

    await user.save();

    return NextResponse.json({
      status: "ok",
      user: {
        id: user._id,
        email: user.email,
        first: user.first,
        last: user.last,
        phone: user.phone,
        isAdmin: user.isAdmin,
        sourceIds: user.sourceIds.map((id: mongoose.Types.ObjectId) =>
          id.toString()
        ),
        denseMode: user.denseMode || false,
        darkMode: user.darkMode || false,
      },
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
