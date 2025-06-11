import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Post } from "@/models/post.model";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { cookies } from "next/headers";

export async function GET(): Promise<NextResponse> {
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

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const posts = await Post.find({})
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl summary imageUrl")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ status: "ok", posts });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting posts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

interface PostRequestBody {
  storyId: string;
  text: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const { userId } = userService.verifyToken(token);
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const body: PostRequestBody = await request.json();
    const { storyId, text } = body;

    if (!storyId || !text?.trim()) {
      return NextResponse.json(
        {
          error: "Bad request",
          message: "StoryId and text are required fields",
        },
        { status: 400 }
      );
    }

    const newPost = new Post({
      storyId,
      userId: user._id,
      text: text.trim(),
    });

    await newPost.save();
    await newPost.populate("userId", "first last email");
    await newPost.populate("storyId", "fullHeadline articleUrl");

    return NextResponse.json({ status: "ok", post: newPost }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
