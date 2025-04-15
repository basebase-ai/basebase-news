import { ISource, Source } from "../models/source.model";
import { IHeadline } from "../models/headline.model";
import { scraperService } from "./scraper.service";
import { connectDB, getCollection } from "./mongo.service";
import mongoose from "mongoose";

interface HeadlineDocument extends IHeadline, mongoose.Document {}

interface SourceWithHeadlines extends ISource {
  headlines: IHeadline[];
}

export class HeadlineService {
  public async addSource(source: ISource): Promise<void> {
    const exists = await Source.exists({ name: source.name });
    if (exists) {
      throw new Error(`Source ${source.name} already exists`);
    }
    await Source.create(source);
  }

  public async updateSource(sourceId: string, source: ISource): Promise<void> {
    const updated = await Source.findByIdAndUpdate(sourceId, source, {
      new: true,
    });
    if (!updated) {
      throw new Error(`Source with id ${sourceId} not found`);
    }
  }

  public async getSources(): Promise<ISource[]> {
    return Source.find();
  }

  public async addHeadlines(
    sourceId: string,
    headlines: IHeadline[]
  ): Promise<boolean> {
    const headlinesWithMetadata = headlines.map((headline, index) => ({
      ...headline,
      sourceId,
      inPageRank: index + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Save to MongoDB
    await getCollection<HeadlineDocument>("headlines").insertMany(
      headlinesWithMetadata as HeadlineDocument[]
    );
    return true;
  }

  public async getRecentHeadlines(): Promise<IHeadline[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return getCollection<HeadlineDocument>("headlines")
      .find({ createdAt: { $gte: oneHourAgo } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  public async getSourcesWithHeadlines(): Promise<SourceWithHeadlines[]> {
    const sources = await Source.find().lean();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const headlines = await getCollection<HeadlineDocument>("headlines")
      .find({ createdAt: { $gte: oneHourAgo } })
      .sort({ createdAt: -1 })
      .toArray();

    return sources.map((source) => ({
      ...source,
      headlines: headlines.filter((h) => h.sourceId === source._id.toString()),
    }));
  }
}

export const headlineService = new HeadlineService();
