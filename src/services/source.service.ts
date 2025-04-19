import { ISource, Source } from "../models/source.model";
import mongoose from "mongoose";

export class SourceService {
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
}

export const sourceService = new SourceService();
