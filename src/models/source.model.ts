import mongoose from "mongoose";

export interface ISource {
  name: string;
  homepageUrl: string;
  includeSelector: string;
  excludeSelector?: string;
  biasScore?: number;
  lastScrapedAt?: Date;
}

export const Source = mongoose.model<ISource>(
  "Source",
  new mongoose.Schema({
    name: String,
    homepageUrl: { type: String, unique: true },
    includeSelector: String,
    excludeSelector: String,
    biasScore: Number,
    lastScrapedAt: Date,
  })
);
