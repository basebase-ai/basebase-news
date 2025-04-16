import { Source, ISource } from "../models/source.model";
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
    // Archive existing headlines for this source
    await getCollection<HeadlineDocument>("headlines").updateMany(
      { sourceId, archived: { $ne: true } },
      { $set: { archived: true } }
    );

    const headlinesWithMetadata = headlines.map((headline, index) => ({
      ...headline,
      sourceId,
      inPageRank: index + 1,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Save to MongoDB
    await getCollection<HeadlineDocument>("headlines").insertMany(
      headlinesWithMetadata as HeadlineDocument[]
    );

    // Update source lastScrapedAt
    await Source.findByIdAndUpdate(sourceId, { lastScrapedAt: new Date() });

    return true;
  }

  public async getRecentHeadlines(): Promise<IHeadline[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return getCollection<HeadlineDocument>("headlines")
      .find({ createdAt: { $gte: oneHourAgo }, archived: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  public async getSourcesWithHeadlines(): Promise<SourceWithHeadlines[]> {
    const sources = await Source.find().lean();
    console.log(`Found ${sources.length} sources`);

    const headlines = await getCollection<HeadlineDocument>("headlines")
      .find({ archived: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();
    console.log(`Found ${headlines.length} non-archived headlines`);

    const sourcesWithHeadlines = sources.map((source) => {
      const sourceHeadlines = headlines.filter(
        (h) => h.sourceId === source._id.toString()
      );
      console.log(
        `Source ${source.name} has ${sourceHeadlines.length} headlines`
      );
      return {
        ...source,
        headlines: sourceHeadlines,
      };
    });

    return sourcesWithHeadlines;
  }
}

export const headlineService = new HeadlineService();
