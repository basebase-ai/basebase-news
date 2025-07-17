import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  db,
} from "basebase-js";
import { Source } from "@/types";

export interface ISource extends Source {}

export class SourceService {
  async getSources(): Promise<Source[]> {
    try {
      console.log("[SourceService] Getting all sources");

      const sourcesCollection = collection(db, "newswithfriends/newsSources");
      const sourcesSnap = await getDocs(sourcesCollection);

      const sources: Source[] = [];
      sourcesSnap.forEach((docSnap) => {
        sources.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Source);
      });

      return sources;
    } catch (error) {
      console.error("[SourceService] Error getting sources:", error);
      throw error;
    }
  }

  async getSource(id: string): Promise<Source | null> {
    try {
      console.log("[SourceService] Getting source:", id);

      const sourcesCollection = collection(db, "newswithfriends/newsSources");
      const sourcesSnap = await getDocs(sourcesCollection);

      let foundSource: Source | null = null;
      sourcesSnap.forEach((docSnap) => {
        if (docSnap.id === id) {
          foundSource = {
            id: docSnap.id,
            ...docSnap.data(),
          } as Source;
        }
      });

      return foundSource;
    } catch (error) {
      console.error("[SourceService] Error getting source:", error);
      throw new Error(`Source with id ${id} not found`);
    }
  }

  async searchSources(query: string | null): Promise<Source[]> {
    if (!query || query.trim().length === 0) {
      return this.getSources();
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Get all sources and filter/sort in memory since BaseBase doesn't support text search yet
    const sources = await this.getSources();

    return sources
      .filter((source: Source) =>
        source.name.toLowerCase().includes(trimmedQuery)
      )
      .sort((a: Source, b: Source) => {
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

  async addSource(sourceData: Omit<Source, "id">): Promise<Source> {
    try {
      console.log("[SourceService] Adding source:", sourceData.name);

      const sourcesCollection = collection(db, "newswithfriends/newsSources");
      const docRef = await addDoc(sourcesCollection, sourceData);

      return {
        id: docRef.id,
        ...sourceData,
      };
    } catch (error) {
      console.error("[SourceService] Error adding source:", error);
      throw error;
    }
  }

  async updateSource(
    id: string,
    sourceData: Partial<Source>
  ): Promise<Source | null> {
    try {
      console.log("[SourceService] Updating source:", id);

      const sourceRef = doc(db, `newswithfriends/newsSources/${id}`);
      await updateDoc(sourceRef, sourceData);

      // Return the updated source
      return await this.getSource(id);
    } catch (error) {
      console.error("[SourceService] Error updating source:", error);
      throw error;
    }
  }
}

export const sourceService = new SourceService();

// Keep the standalone functions for backward compatibility
export async function getSources(): Promise<Source[]> {
  return sourceService.getSources();
}

export async function getSource(id: string): Promise<Source | null> {
  return sourceService.getSource(id);
}

export async function searchSources(query: string | null): Promise<Source[]> {
  return sourceService.searchSources(query);
}
