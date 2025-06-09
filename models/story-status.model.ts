import mongoose, { Document, Model, Types } from "mongoose";

export interface IStoryStatus extends Document {
  userId: Types.ObjectId;
  storyId: Types.ObjectId;
  status: "READ";
}

const storyStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    status: {
      type: String,
      enum: ["READ"],
      required: true,
    },
  },
  { timestamps: true }
);

// Create compound index on userId and storyId pair
storyStatusSchema.index({ userId: 1, storyId: 1 }, { unique: true });

export const StoryStatus: Model<IStoryStatus> =
  mongoose.models.StoryStatus ||
  mongoose.model<IStoryStatus>("StoryStatus", storyStatusSchema);
