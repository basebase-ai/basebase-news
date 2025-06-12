import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Post } from "@/models/post.model";
import { Story } from "@/models/story.model";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { cookies } from "next/headers";

export async function GET(): Promise<NextResponse> {
  try {
    console.log("[Posts API] Starting GET request");
    await connectToDatabase();
    console.log("[Posts API] Database connected");

    // Ensure models are registered
    console.log("[Posts API] Ensuring models are registered...");
    console.log("[Posts API] Story model:", Story.modelName);
    console.log("[Posts API] User model:", User.modelName);
    console.log("[Posts API] Post model:", Post.modelName);

    const tokenCookie = cookies().get("auth");
    if (!tokenCookie) {
      console.log("[Posts API] No auth token found");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }
    const token = tokenCookie.value;
    console.log("[Posts API] Token found, verifying...");

    const { userId } = userService.verifyToken(token);
    console.log("[Posts API] Token verified for userId:", userId);

    const user = await User.findById(userId);
    console.log(
      "[Posts API] User lookup result:",
      user ? "found" : "not found"
    );

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    console.log("[Posts API] Querying posts...");
    const posts = await Post.find({})
      .populate("userId", "first last email imageUrl")
      .populate({
        path: "storyId",
        select: "fullHeadline articleUrl summary imageUrl sourceId",
        populate: {
          path: "sourceId",
          select: "name homepageUrl imageUrl",
        },
      })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log("[Posts API] Found", posts.length, "posts");

    // Get comments for each post
    console.log("[Posts API] Fetching comments for posts...");
    const { Comment } = await import("@/models/comment.model");

    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await Comment.find({ postId: post._id })
          .populate("userId", "first last email imageUrl")
          .sort({ createdAt: 1 }); // Oldest first for comments

        const postObject = post.toObject();

        const story = postObject.storyId as any;
        if (story && story.sourceId) {
          story.source = story.sourceId;
          delete story.sourceId;
        }

        return {
          ...postObject,
          comments: comments.map((comment) => {
            const user = comment.userId as any;
            return {
              _id: comment._id,
              text: comment.text,
              createdAt: comment.createdAt,
              userId: {
                _id: user._id,
                first: user.first,
                last: user.last,
                email: user.email,
                imageUrl: user.imageUrl,
              },
            };
          }),
        };
      })
    );

    console.log("[Posts API] Added comments to posts");
    return NextResponse.json({ status: "ok", posts: postsWithComments });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Posts API] Error getting posts:", error);
    if (error instanceof Error) {
      console.error("[Posts API] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
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
