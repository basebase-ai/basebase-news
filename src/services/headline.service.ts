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
  private trimSourceFields(source: ISource): Partial<ISource> {
    return {
      name: source.name?.trim(),
      homepageUrl: source.homepageUrl?.trim(),
      rssUrl: source.rssUrl?.trim(),
      includeSelector: source.includeSelector?.trim(),
      excludeSelector: source.excludeSelector?.trim(),
      tags: source.tags?.map((tag) => tag.trim()),
      imageUrl: source.imageUrl?.trim(),
      biasScore: source.biasScore,
      hasPaywall: source.hasPaywall,
    };
  }

  public async addSource(source: ISource): Promise<void> {
    const trimmedSource = this.trimSourceFields(source);
    const exists = await Source.exists({ name: trimmedSource.name });
    if (exists) {
      throw new Error(`Source ${trimmedSource.name} already exists`);
    }
    await Source.create(trimmedSource);
  }

  public async updateSource(sourceId: string, source: ISource): Promise<void> {
    const trimmedSource = this.trimSourceFields(source);
    const updated = await Source.findByIdAndUpdate(sourceId, trimmedSource, {
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
    console.log(
      `Processing ${headlines.length} headlines for source ${sourceId}`
    );

    // Archive existing headlines for this source
    const archivedCount = await Headline.updateMany(
      { sourceId: objectId, archived: { $ne: true } },
      { $set: { archived: true } }
    );
    console.log(`Archived ${archivedCount.modifiedCount} existing headlines`);

    for (const [index, headline] of headlines.entries()) {
      const existingHeadline = await Headline.findOne({
        articleUrl: headline.articleUrl,
      });

      if (existingHeadline) {
        console.log(`Updating existing headline: ${headline.articleUrl}`);
        await Headline.findByIdAndUpdate(existingHeadline._id, {
          ...headline,
          sourceId: objectId,
          inPageRank: index + 1,
          archived: false,
          updatedAt: new Date(),
        });
      } else {
        console.log(`Creating new headline: ${headline.articleUrl}`);
        await Headline.create({
          ...headline,
          sourceId: objectId,
          inPageRank: index + 1,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return true;
  }

  public async getHeadlines(sourceId: string): Promise<IHeadline[]> {
    const objectId = new mongoose.Types.ObjectId(sourceId);

    const headlines = await Headline.find({
      sourceId: objectId,
      archived: { $ne: true },
    })
      .sort({ inPageRank: 1 })
      .limit(20);

    return headlines;
  }
}

export const headlineService = new HeadlineService();
