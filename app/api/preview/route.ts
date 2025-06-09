import { NextResponse } from "next/server";
import { previewService } from "@/services/preview.service";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { status: "error", message: "URL is required" },
        { status: 400 }
      );
    }

    const preview = await previewService.getPageMetadata(url);
    return NextResponse.json({ status: "ok", preview });
  } catch (error) {
    console.error("Error fetching preview:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
