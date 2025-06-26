import { NextRequest, NextResponse } from "next/server";
import { edgeAuthService } from "@/services/auth.edge.service";
import { Story } from "@/models/story.model";
import { userService } from "@/services/user.service";
import { connectToDatabase } from "@/services/mongodb.service";
import { verifyAuth } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await edgeAuthService.verifyToken(token);
    const user = await userService.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    if (!since) {
      return NextResponse.json({ updatedSourceIds: [] });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid 'since' timestamp" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updatedStories = await Story.find({
      source: { $in: user.sourceIds },
      createdAt: { $gt: sinceDate },
    }).distinct("source");

    const updatedSourceIds = updatedStories.map((id) => (id as any).toString());

    return NextResponse.json({ updatedSourceIds });
  } catch (error) {
    console.error("Error checking for story updates:", error);
    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
