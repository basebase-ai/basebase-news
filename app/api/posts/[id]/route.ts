import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Post } from "@/models/post.model";
import { userService } from "@/services/user.service";
import { User } from "@/models/user.model";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const postId = params.id;
    const post = await Post.findById(postId)
      .populate("userId", "first last email")
      .populate("storyId", "fullHeadline articleUrl");

    if (!post) {
      return NextResponse.json(
        { status: "error", message: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", post });
  } catch (error) {
    console.error("[Post API] Error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

interface UpdatePostRequestBody {
  text: string;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const postId = params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return NextResponse.json(
        { status: "error", message: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user owns the post or is admin
    if (
      post.userId.toString() !==
        (user._id as mongoose.Types.ObjectId).toString() &&
      !user.isAdmin
    ) {
      return NextResponse.json(
        { status: "error", message: "Not authorized to edit this post" },
        { status: 403 }
      );
    }

    const body: UpdatePostRequestBody = await req.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Text is required" },
        { status: 400 }
      );
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { text: text.trim() },
      { new: true, runValidators: true }
    )
      .populate("userId", "first last email")
      .populate("storyId", "fullHeadline articleUrl");

    return NextResponse.json({ status: "ok", post: updatedPost });
  } catch (error) {
    console.error("[Post API] Error updating post:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const postId = params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return NextResponse.json(
        { status: "error", message: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user owns the post or is admin
    if (
      post.userId.toString() !==
        (user._id as mongoose.Types.ObjectId).toString() &&
      !user.isAdmin
    ) {
      return NextResponse.json(
        { status: "error", message: "Not authorized to delete this post" },
        { status: 403 }
      );
    }

    await Post.findByIdAndDelete(postId);

    return NextResponse.json({
      status: "ok",
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("[Post API] Error deleting post:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
