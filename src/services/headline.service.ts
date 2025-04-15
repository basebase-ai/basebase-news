import { INewsSource, NEWS_SOURCES } from "../models/newssource.model";
import { IHeadline } from "../models/headline.model";
import { ScraperService } from "./scraper.service";
import { connectDB, getCollection } from "./mongo.service";
import mongoose from "mongoose";

interface HeadlineDocument extends IHeadline, mongoose.Document {}

export class HeadlineService {
  private readonly scraperService: ScraperService;
  private readonly sources: Map<string, INewsSource>;

  constructor() {
    this.scraperService = new ScraperService();
    this.sources = new Map(Object.entries(NEWS_SOURCES));
  }

  public async addSource(source: INewsSource): Promise<void> {
    if (this.sources.has(source.name)) {
      throw new Error(`Source ${source.name} already exists`);
    }
    this.sources.set(source.name, source);
  }

  public async updateSource(
    sourceId: string,
    source: INewsSource
  ): Promise<void> {
    if (!this.sources.has(sourceId)) {
      throw new Error(`Source ${sourceId} not found`);
    }
    this.sources.set(sourceId, source);
  }

  public async getSources(): Promise<INewsSource[]> {
    return Array.from(this.sources.values());
  }

  public async getHeadlines(sourceId: string): Promise<IHeadline[]> {
    if (!this.sources.has(sourceId)) {
      throw new Error(`Source ${sourceId} not found`);
    }
    const headlines: IHeadline[] = await this.scraperService.scrapePage(
      sourceId
    );
    return headlines.map((headline) => ({
      ...headline,
      sourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  public async addHeadlines(sourceId: string): Promise<void> {
    if (!this.sources.has(sourceId)) {
      throw new Error(`Source ${sourceId} not found`);
    }
    const headlines: IHeadline[] = await this.getHeadlines(sourceId);
    await getCollection<HeadlineDocument>("headlines").insertMany(
      headlines as HeadlineDocument[]
    );
  }
}
