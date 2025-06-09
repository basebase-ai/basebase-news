import mongoose, { Document, Model } from "mongoose";

export interface ISource extends Document {
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  includeSelector: string;
  excludeSelector?: string;
  biasScore?: number;
  lastScrapedAt?: Date;
  tags?: string[];
  imageUrl?: string;
  hasPaywall: boolean;
}

const sourceSchema = new mongoose.Schema({
  name: String,
  homepageUrl: { type: String, unique: true },
  rssUrl: String,
  includeSelector: String,
  excludeSelector: String,
  biasScore: Number,
  lastScrapedAt: Date,
  tags: { type: [String], default: [] },
  imageUrl: String,
  hasPaywall: { type: Boolean, default: false },
});

export const Source: Model<ISource> =
  mongoose.models.Source || mongoose.model<ISource>("Source", sourceSchema);
