import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  getDatabase,
} from "basebase-js";
import { Source } from "@/types";

export interface ISource extends Source {}

// Create database instance with JWT token for server environment
if (!process.env.BASEBASE_TOKEN) {
  throw new Error(
    "BASEBASE_TOKEN environment variable is required for server-side services"
  );
}

const db = getDatabase(process.env.BASEBASE_TOKEN!);

export class SourceServerService {
  async getSources(): Promise<Source[]> {
    try {
      console.log("[SourceServerService] Getting all sources");

      const sourcesCollection = collection(db, "newswithfriends/news_sources");
      const sourcesSnap = await getDocs(query(sourcesCollection));

      const sources: Source[] = [];
      sourcesSnap.forEach((docSnap) => {
        sources.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Source);
      });

      console.log(`[SourceServerService] Found ${sources.length} sources`);
      return sources;
    } catch (error) {
      console.error("[SourceServerService] Error getting sources:", error);
      throw error;
    }
  }

  async getSource(id: string): Promise<Source | null> {
    try {
      console.log("[SourceServerService] Getting source:", id);

      const sourcesCollection = collection(db, "newswithfriends/news_sources");
      const sourcesSnap = await getDocs(query(sourcesCollection));

      for (const docSnap of sourcesSnap.docs) {
        if (docSnap.id === id) {
          const foundSource: Source = {
            id: docSnap.id,
            ...docSnap.data(),
          } as Source;

          console.log(
            `[SourceServerService] Found source: ${foundSource.name}`
          );
          return foundSource;
        }
      }

      console.warn(`[SourceServerService] Source not found: ${id}`);
      return null;
    } catch (error) {
      console.error("[SourceServerService] Error getting source:", error);
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
      console.log("[SourceServerService] Adding source:", sourceData.name);

      const sourcesCollection = collection(db, "newswithfriends/news_sources");
      const docRef = await addDoc(sourcesCollection, sourceData);

      return {
        id: docRef.id,
        ...sourceData,
      };
    } catch (error) {
      console.error("[SourceServerService] Error adding source:", error);
      throw error;
    }
  }

  async updateSource(
    id: string,
    sourceData: Partial<Source>
  ): Promise<Source | null> {
    try {
      console.log("[SourceServerService] Updating source:", id);

      const sourceRef = doc(db, `newswithfriends/news_sources/${id}`);
      await updateDoc(sourceRef, sourceData);

      console.log(
        `[SourceServerService] Updated source ${id} with:`,
        sourceData
      );

      // Return the updated source
      return await this.getSource(id);
    } catch (error) {
      console.error("[SourceServerService] Error updating source:", error);
      throw error;
    }
  }

  async deleteSource(id: string): Promise<void> {
    try {
      console.log("[SourceServerService] Deleting source:", id);

      const sourceRef = doc(db, `newswithfriends/news_sources/${id}`);
      await deleteDoc(sourceRef);
    } catch (error) {
      console.error("[SourceServerService] Error deleting source:", error);
      throw error;
    }
  }
}

export const sourceServerService = new SourceServerService();
