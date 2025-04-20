import mongoose from "mongoose";

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

export interface IStory {
  sourceId: mongoose.Types.ObjectId;
  fullHeadline: string;
  summary: string;
  description?: string | null;
  articleUrl: string;
  section: Section;
  type: NewsTopic;
  inPageRank: number;
  imageUrl?: string | null;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Story = mongoose.model<IStory>(
  "Story",
  new mongoose.Schema({
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Source",
      required: true,
    },
    fullHeadline: { type: String, required: true },
    summary: String,
    description: String,
    articleUrl: { type: String, unique: true, required: true },
    section: String,
    type: String,
    inPageRank: Number,
    imageUrl: String,
    archived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);
