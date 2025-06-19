import mongoose, { Document, Model } from "mongoose";

export enum Section {
  NEWS = "news",
  OPINION = "opinion",
  SPORTS = "sports",
  ENTERTAINMENT = "entertainment",
  LIFESTYLE = "lifestyle",
}

// these are topics inside the news section
export enum NewsTopic {
  US_POLITICS = "us politics",
  WORLD_POLITICS = "world politics",
  FINANCE_ECONOMICS = "finance & economics",
  BUSINESS = "business",
  SCIENCE_TECHNOLOGY = "science & technology",
  HEALTH = "health",
}

export interface IStory extends Document {
  articleUrl: string;
  sourceId: mongoose.Types.ObjectId;
  fullHeadline: string;
  summary?: string | null;
  fullText?: string | null;
  section: Section;
  type: NewsTopic;
  inPageRank: number;
  imageUrl?: string | null;
  authorNames?: string[];
  archived?: boolean;
  lastScrapedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const storySchema = new mongoose.Schema({
  articleUrl: { type: String, unique: true, required: true },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Source",
    required: true,
  },
  fullHeadline: { type: String, required: true },
  summary: { type: String },
  fullText: { type: String },
  section: String,
  type: String,
  inPageRank: Number,
  imageUrl: String,
  authorNames: [String],
  archived: { type: Boolean, default: false },
  lastScrapedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for optimal search performance
storySchema.index(
  {
    fullHeadline: "text",
    summary: "text",
    fullText: "text",
  },
  {
    weights: {
      fullHeadline: 10,
      summary: 5,
      fullText: 1,
    },
    name: "story_text_search",
  }
);

// Compound index for filtering and sorting (most common query pattern)
storySchema.index({ archived: 1, createdAt: -1 });

// Compound index for source-based queries with date sorting
storySchema.index({ sourceId: 1, archived: 1, createdAt: -1 });

// Index for date range queries
storySchema.index({ createdAt: -1 });

// Index for source filtering
storySchema.index({ sourceId: 1 });

// Index for finding stories by rank within a source
storySchema.index({ sourceId: 1, inPageRank: 1 });

export const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", storySchema);
