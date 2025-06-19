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
   * Search for sources by name. If the query is empty, all sources will be returned.
   * @param query The search term to match against the source name.
   * @returns A list of matching sources, sorted by relevance.
   */
  public async searchSources(query: string | null): Promise<ISource[]> {
    if (!query || query.trim().length === 0) {
      return Source.find().sort({ name: 1 }).lean();
    }

    const trimmedQuery = query.trim();
    const searchRegex = new RegExp(trimmedQuery, "i");

    const sources = await Source.aggregate([
      {
        $match: { name: searchRegex },
      },
      {
        $addFields: {
          sortWeight: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [{ $toLower: "$name" }, { $toLower: trimmedQuery }],
                  },
                  then: 1, // Exact match
                },
                {
                  case: {
                    $regexMatch: {
                      input: "$name",
                      regex: `^${trimmedQuery}`,
                      options: "i",
                    },
                  },
                  then: 2, // Starts with match
                },
              ],
              default: 3, // Contains match
            },
          },
        },
      },
      {
        $sort: {
          sortWeight: 1, // Sort by our new weight field
          name: 1, // Then alphabetically
        },
      },
      {
        $limit: 20,
      },
    ]);

    return sources;
  }
}

export const sourceService = new SourceService();
