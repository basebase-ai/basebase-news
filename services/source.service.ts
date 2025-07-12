import { doc, getDoc, getDocs, addDoc, updateDoc, collection } from "basebase";
import { db } from "./basebase.service";

// Define the Source interface based on BaseBase's NewsSource type
export interface ISource {
  id?: string;
  creator?: string;
  name: string;
  homepageUrl?: string;
  rssUrl?: string;
  lastScrapedAt?: string;
  includeSelector?: string;
  excludeSelector?: string;
  tags?: string[];
  biasScore?: number;
  hasPaywall?: boolean;
}

export class SourceService {
  constructor() {
    // No need to store client, use direct db import
  }

  private trimSourceFields(source: ISource): Partial<ISource> {
    // Remove trailing slashes from URLs
    const homepageUrl = source.homepageUrl?.trim().replace(/\/+$/, "");
    const rssUrl = source.rssUrl?.trim().replace(/\/+$/, "");

    return {
      name: source.name?.trim(),
      homepageUrl,
      rssUrl,
      includeSelector: source.includeSelector?.trim(),
      excludeSelector: source.excludeSelector?.trim(),
      tags: source.tags?.map((tag: string) => tag.trim()),
      biasScore: source.biasScore,
      hasPaywall: source.hasPaywall,
      lastScrapedAt: new Date().toISOString(), // Add required lastScrapedAt field
    };
  }

  public async addSource(source: ISource): Promise<void> {
    try {
      const trimmedSource = this.trimSourceFields(source);
      const sourcesCollection = collection(db, "newsSources");
      await addDoc(sourcesCollection, trimmedSource);
    } catch (error) {
      console.error("Error adding source:", error);
      throw error;
    }
  }

  public async updateSource(sourceId: string, source: ISource): Promise<void> {
    try {
      const trimmedSource = this.trimSourceFields(source);
      const sourceRef = doc(db, `newsSources/${sourceId}`);
      await updateDoc(sourceRef, trimmedSource);
    } catch (error) {
      console.error("Error updating source:", error);
      throw new Error(`Source with id ${sourceId} not found`);
    }
  }

  public async getSource(id: string): Promise<ISource | null> {
    try {
      const sourceRef = doc(db, `newsSources/${id}`);
      const sourceSnap = await getDoc(sourceRef);

      if (sourceSnap.exists) {
        return { id: sourceSnap.id, ...sourceSnap.data() } as ISource;
      }
      return null;
    } catch (error) {
      console.error("Error getting source:", error);
      throw new Error(`Source with id ${id} not found`);
    }
  }

  public async getSources(): Promise<ISource[]> {
    try {
      const sourcesCollection = collection(db, "newsSources");
      const sourcesSnap = await getDocs(sourcesCollection);

      const sources: ISource[] = [];
      sourcesSnap.forEach((doc) => {
        sources.push({ id: doc.id, ...doc.data() } as ISource);
      });

      return sources;
    } catch (error) {
      console.error("Error getting sources:", error);
      throw error;
    }
  }

  /**
   * Search for sources by name. If the query is empty, all sources will be returned.
   * @param query The search term to match against the source name.
   * @returns A list of matching sources, sorted by relevance.
   */
  public async searchSources(query: string | null): Promise<ISource[]> {
    if (!query || query.trim().length === 0) {
      return this.getSources();
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Get all sources and filter/sort in memory since BaseBase doesn't support text search yet
    const sources = await this.getSources();

    return sources
      .filter((source: ISource) =>
        source.name.toLowerCase().includes(trimmedQuery)
      )
      .sort((a: ISource, b: ISource) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Exact match gets highest priority
        if (aName === trimmedQuery && bName !== trimmedQuery) return -1;
        if (bName === trimmedQuery && aName !== trimmedQuery) return 1;

        // Starts with gets second priority
        if (aName.startsWith(trimmedQuery) && !bName.startsWith(trimmedQuery))
          return -1;
        if (bName.startsWith(trimmedQuery) && !aName.startsWith(trimmedQuery))
          return 1;

        // Default to alphabetical order
        return aName.localeCompare(bName);
      })
      .slice(0, 20); // Limit to 20 results
  }
}

export const sourceService = new SourceService();
