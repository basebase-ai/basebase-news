import mongoose from "mongoose";

export interface ISource {
  name: string;
  homepageUrl: string;
  cssSelector: string;
  biasScore?: number;
  lastScrapedAt?: Date;
}

export const Source = mongoose.model<ISource>(
  "Source",
  new mongoose.Schema({
    name: String,
    homepageUrl: { type: String, unique: true },
    cssSelector: String,
    biasScore: Number,
    lastScrapedAt: Date,
  })
);
