import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { edgeAuthService } from "@/services/auth.edge.service";
import { sourceService } from "@/services/source.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const token = edgeAuthService.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    await edgeAuthService.verifyToken(token);
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    const sources = await sourceService.searchSources(query);

    return NextResponse.json({
      status: "ok",
      sources,
    });
  } catch (error) {
    console.error("[Source Search API] Error:", error);
    if (error instanceof Error && error.message.includes("Invalid token")) {
      return NextResponse.json(
        { status: "error", message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
