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

export const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", storySchema);
