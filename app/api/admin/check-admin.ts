import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { User } from "@/models/user.model";
import { edgeAuthService } from "@/services/auth.edge.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const { userId } = await edgeAuthService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Admin Check] Error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
