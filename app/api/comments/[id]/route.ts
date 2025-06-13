import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Comment } from "@/models/comment.model";
import { Story } from "@/models/story.model";
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

    const commentId = params.id;
    const comment = await Comment.findById(commentId)
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl");

    if (!comment) {
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", comment });
  } catch (error) {
    console.error("[Comment API] Error:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

interface UpdateCommentRequestBody {
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

    const commentId = params.id;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check if user owns the comment or is admin
    if (
      comment.userId.toString() !==
        (user._id as mongoose.Types.ObjectId).toString() &&
      !user.isAdmin
    ) {
      return NextResponse.json(
        { status: "error", message: "Not authorized to edit this comment" },
        { status: 403 }
      );
    }

    const body: UpdateCommentRequestBody = await req.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Text is required" },
        { status: 400 }
      );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { text: text.trim() },
      { new: true, runValidators: true }
    )
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl");

    return NextResponse.json({ status: "ok", comment: updatedComment });
  } catch (error) {
    console.error("[Comment API] Error updating comment:", error);
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

    const commentId = params.id;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check if user owns the comment or is admin
    if (
      comment.userId.toString() !==
        (user._id as mongoose.Types.ObjectId).toString() &&
      !user.isAdmin
    ) {
      return NextResponse.json(
        { status: "error", message: "Not authorized to delete this comment" },
        { status: 403 }
      );
    }

    await Comment.findByIdAndDelete(commentId);

    return NextResponse.json({
      status: "ok",
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("[Comment API] Error deleting comment:", error);
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}
