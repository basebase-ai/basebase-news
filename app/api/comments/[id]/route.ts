import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/services/mongodb.service";
import { Comment } from "@/models/comment.model";
import { Story } from "@/models/story.model";
import { edgeAuthService } from "@/services/auth.edge.service";
import { User } from "@/models/user.model";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    console.log("[/api/comments/[id]] GET request received for ID:", params.id);

    await connectToDatabase();
    console.log("[/api/comments/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/comments/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/comments/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/comments/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/comments/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/comments/[id]] User lookup:", {
      userFound: !!user,
      userId,
    });

    if (!user) {
      console.error("[/api/comments/[id]] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const commentId = params.id;
    console.log("[/api/comments/[id]] Looking up comment:", commentId);

    const comment = await Comment.findById(commentId)
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl");

    console.log("[/api/comments/[id]] Comment lookup result:", {
      commentFound: !!comment,
      commentId,
    });

    if (!comment) {
      console.error("[/api/comments/[id]] Comment not found:", commentId);
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    console.log("[/api/comments/[id]] Success - returning comment");
    return NextResponse.json({ status: "ok", comment });
  } catch (error) {
    console.error("[/api/comments/[id]] Error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/comments/[id]] Invalid token error");
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

interface UpdateCommentRequestBody {
  text: string;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    console.log("[/api/comments/[id]] PUT request received for ID:", params.id);

    await connectToDatabase();
    console.log("[/api/comments/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/comments/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/comments/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/comments/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/comments/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/comments/[id]] User lookup:", {
      userFound: !!user,
      isAdmin: user?.isAdmin || false,
    });

    if (!user) {
      console.error("[/api/comments/[id]] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const commentId = params.id;
    console.log(
      "[/api/comments/[id]] Looking up comment to update:",
      commentId
    );

    const comment = await Comment.findById(commentId);
    console.log("[/api/comments/[id]] Comment lookup result:", {
      commentFound: !!comment,
      commentUserId: comment?.userId?.toString() || null,
    });

    if (!comment) {
      console.error("[/api/comments/[id]] Comment not found:", commentId);
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check if user owns the comment or is admin
    const isOwner =
      comment.userId.toString() ===
      (user._id as mongoose.Types.ObjectId).toString();
    const canEdit = isOwner || user.isAdmin;

    console.log("[/api/comments/[id]] Authorization check:", {
      isOwner,
      isAdmin: user.isAdmin,
      canEdit,
    });

    if (!canEdit) {
      console.error("[/api/comments/[id]] User not authorized to edit comment");
      return NextResponse.json(
        { status: "error", message: "Not authorized to edit this comment" },
        { status: 403 }
      );
    }

    const body: UpdateCommentRequestBody = await req.json();
    const { text } = body;
    console.log("[/api/comments/[id]] Update data:", {
      hasText: !!text,
      textLength: text?.length || 0,
    });

    if (!text?.trim()) {
      console.error("[/api/comments/[id]] Missing text in request");
      return NextResponse.json(
        { status: "error", message: "Text is required" },
        { status: 400 }
      );
    }

    console.log("[/api/comments/[id]] Updating comment...");
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { text: text.trim() },
      { new: true, runValidators: true }
    )
      .populate("userId", "first last email imageUrl")
      .populate("storyId", "fullHeadline articleUrl");

    console.log("[/api/comments/[id]] Comment updated successfully");
    return NextResponse.json({ status: "ok", comment: updatedComment });
  } catch (error) {
    console.error("[/api/comments/[id]] Update error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/comments/[id]] Invalid token error");
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    console.log(
      "[/api/comments/[id]] DELETE request received for ID:",
      params.id
    );

    await connectToDatabase();
    console.log("[/api/comments/[id]] Database connected");

    const token = edgeAuthService.extractTokenFromRequest(req);
    console.log("[/api/comments/[id]] Token extraction:", {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.error("[/api/comments/[id]] No token found in request");
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[/api/comments/[id]] Verifying token...");
    const { userId } = await edgeAuthService.verifyToken(token);
    console.log("[/api/comments/[id]] Token verified, userId:", userId);

    const user = await User.findById(userId);
    console.log("[/api/comments/[id]] User lookup:", {
      userFound: !!user,
      isAdmin: user?.isAdmin || false,
    });

    if (!user) {
      console.error("[/api/comments/[id]] User not found for ID:", userId);
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    const commentId = params.id;
    console.log(
      "[/api/comments/[id]] Looking up comment to delete:",
      commentId
    );

    const comment = await Comment.findById(commentId);
    console.log("[/api/comments/[id]] Comment lookup result:", {
      commentFound: !!comment,
      commentUserId: comment?.userId?.toString() || null,
    });

    if (!comment) {
      console.error("[/api/comments/[id]] Comment not found:", commentId);
      return NextResponse.json(
        { status: "error", message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check if user owns the comment or is admin
    const isOwner =
      comment.userId.toString() ===
      (user._id as mongoose.Types.ObjectId).toString();
    const canDelete = isOwner || user.isAdmin;

    console.log("[/api/comments/[id]] Authorization check:", {
      isOwner,
      isAdmin: user.isAdmin,
      canDelete,
    });

    if (!canDelete) {
      console.error(
        "[/api/comments/[id]] User not authorized to delete comment"
      );
      return NextResponse.json(
        { status: "error", message: "Not authorized to delete this comment" },
        { status: 403 }
      );
    }

    console.log("[/api/comments/[id]] Deleting comment...");
    await Comment.findByIdAndDelete(commentId);

    console.log("[/api/comments/[id]] Comment deleted successfully");
    return NextResponse.json({
      status: "ok",
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("[/api/comments/[id]] Delete error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Invalid token")) {
      console.error("[/api/comments/[id]] Invalid token error");
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
