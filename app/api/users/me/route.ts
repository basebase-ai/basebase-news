import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { User, IUser } from "@/models/user.model";
import { connectToDatabase } from "@/services/mongodb.service";
import { Types } from "mongoose";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const tokenCookie = cookies().get("auth");
    if (!tokenCookie) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }
    const token = tokenCookie.value;

    try {
      const { userId } = userService.verifyToken(token);
      const user = (await User.findById(userId).lean()) as
        | (IUser & { _id: Types.ObjectId })
        | null;

      if (!user) {
        const response = NextResponse.json(
          { status: "error", message: "User not found" },
          { status: 404 }
        );
        response.cookies.delete("auth");
        return response;
      }

      console.log("Backend user object:", user);

      return NextResponse.json({
        status: "ok",
        user: {
          id: user._id.toString(),
          email: user.email,
          first: user.first,
          last: user.last,
          imageUrl: user.imageUrl,
          isAdmin: user.isAdmin,
          sourceIds: user.sourceIds.map((id) => id.toString()),
          denseMode: user.denseMode || false,
          darkMode: user.darkMode || false,
        },
      });
    } catch (error) {
      console.error("[/api/users/me] Token verification error:", error);
      const response = NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 }
      );
      response.cookies.delete("auth");
      return response;
    }
  } catch (error) {
    console.error("[/api/users/me] Server error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
