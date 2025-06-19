import { ISource, Source } from "../models/source.model";
import mongoose from "mongoose";

export class SourceService {
  private trimSourceFields(source: ISource): Partial<ISource> {
    // Remove trailing slashes from URLs
    const homepageUrl = source.homepageUrl?.trim().replace(/\/+$/, "");
    const rssUrl = source.rssUrl?.trim().replace(/\/+$/, "");
    const imageUrl = source.imageUrl?.trim();

    return {
      name: source.name?.trim(),
      homepageUrl,
      rssUrl,
      includeSelector: source.includeSelector?.trim(),
      excludeSelector: source.excludeSelector?.trim(),
      tags: source.tags?.map((tag) => tag.trim()),
      imageUrl,
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

  /**
   * Search for sources by name.
   * @param query The search term to match against the source name.
   * @returns A list of matching sources.
   */
  public async searchSources(query: string): Promise<ISource[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchRegex = new RegExp(query.trim(), "i");
    return Source.find({ name: searchRegex }).limit(20).lean();
  }
}

export const sourceService = new SourceService();
