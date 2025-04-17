import { Source, ISource } from "../models/source.model";
import { Headline, IHeadline } from "../models/headline.model";
import { scraperService } from "./scraper.service";
import { connectDB } from "./mongo.service";
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
    const objectId = new mongoose.Types.ObjectId(sourceId);

    // Archive existing headlines for this source
    await Headline.updateMany(
      { sourceId: objectId, archived: { $ne: true } },
      { $set: { archived: true } }
    );

    const headlinesWithMetadata = headlines.map((headline, index) => ({
      ...headline,
      sourceId: objectId,
      inPageRank: index + 1,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Save to MongoDB
    await Headline.insertMany(headlinesWithMetadata);

    return true;
  }

  public async getHeadlines(sourceId: string): Promise<IHeadline[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const objectId = new mongoose.Types.ObjectId(sourceId);

    const headlines = await Headline.find({
      sourceId: objectId,
      createdAt: { $gte: oneHourAgo },
      archived: { $ne: true },
    }).sort({ createdAt: -1 });

    return headlines;
  }
}

export const headlineService = new HeadlineService();
