import mongoose, { Document } from "mongoose";

export interface ISource extends Document {
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  includeSelector: string;
  excludeSelector?: string;
  biasScore?: number;
  lastScrapedAt?: Date;
  tags?: string[];
}

export const Source = mongoose.model<ISource>(
  "Source",
  new mongoose.Schema({
    name: String,
    homepageUrl: { type: String, unique: true },
    rssUrl: String,
    includeSelector: String,
    excludeSelector: String,
    biasScore: Number,
    lastScrapedAt: Date,
    tags: { type: [String], default: [] },
  })
);
