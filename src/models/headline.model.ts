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

export interface IHeadline {
  sourceId: string;
  fullHeadline: string;
  summary: string;
  articleUrl: string;
  section: Section;
  type: NewsTopic;
  inPageRank: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Headline = mongoose.model<IHeadline>(
  "Headline",
  new mongoose.Schema({
    sourceId: String,
    fullHeadline: String,
    summary: String,
    articleUrl: String,
    section: String,
    type: String,
    inPageRank: Number,
  })
);
