import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDatabase,
} from "basebase-js";
import type { IStoryStatus } from "../types";

// Define interfaces based on BaseBase types
export interface IStory {
  id?: string;
  creator?: {
    id: string;
    name: string;
  };
  headline: string;
  summary: string;
  url: string;
  imageUrl?: string;
  newsSource: string;
  publishedAt: string;
  createdAt?: string;
}

// Create database instance with JWT token for server environment
if (!process.env.BASEBASE_TOKEN) {
  throw new Error(
    "BASEBASE_TOKEN environment variable is required for server-side services"
  );
}

const db = getDatabase(process.env.BASEBASE_TOKEN!);

export class StoryServerService {
  private prepareStoryData(story: IStory, sourceId: string): any {
    return {
      headline: story.headline,
      summary: story.summary || "No summary available",
      url: story.url,
      imageUrl: story.imageUrl,
      sourceId: sourceId,
      publishedAt: story.publishedAt,
      createdAt: new Date().toISOString(),
    };
  }

  public async addStory(sourceId: string, story: IStory): Promise<IStory> {
    try {
      console.log(
        `[StoryServerService] Adding story: ${story.headline?.substring(0, 100)}...`
      );

      const storyData = this.prepareStoryData(story, sourceId);
      const storiesCollection = collection(db, "newswithfriends/news_stories");
      const docRef = await addDoc(storiesCollection, storyData);

      console.log(`[StoryServerService] Added story with ID: ${docRef.id}`);

      return {
        ...story,
        id: docRef.id,
        createdAt: storyData.createdAt,
      };
    } catch (error) {
      console.error("[StoryServerService] Error adding story:", error);
      throw error;
    }
  }

  /**
   * Get basic stories for a source
   */
  public async getStories(sourceId: string): Promise<IStory[]> {
    try {
      console.log(
        "[StoryServerService] Getting stories for sourceId:",
        sourceId
      );

      const storiesCollection = collection(db, "newswithfriends/news_stories");

      // Use query with where clause to filter by sourceId
      const q = query(
        storiesCollection,
        where("sourceId", "==", sourceId),
        orderBy("publishedAt", "desc"),
        limit(50)
      );

      const storiesSnap = await getDocs(q);
      const storyList: IStory[] = [];

      storiesSnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        storyList.push({
          id: docSnap.id,
          headline: data.headline || data.title || "",
          summary: data.summary || data.description || "",
          url: data.url || data.link || "",
          imageUrl: data.imageUrl || data.image || "",
          newsSource: data.sourceId || sourceId,
          publishedAt:
            data.publishedAt || data.createdAt || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
        } as IStory);
      });

      console.log(
        `[StoryServerService] Found ${storyList.length} stories for source ${sourceId}`
      );
      return storyList;
    } catch (error) {
      console.error("[StoryServerService] Error getting stories:", error);
      return [];
    }
  }

  public async searchStories(
    searchQuery: string | null,
    options: {
      sourceId?: string;
      before?: Date;
      after?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    stories: IStory[];
    totalCount: number;
    hasMore: boolean;
    page: number;
    limit: number;
  }> {
    try {
      console.log(
        "[StoryServerService] searchStories called with query:",
        searchQuery,
        "options:",
        options
      );

      const storiesCollection = collection(db, "newswithfriends/news_stories");

      // Build query constraints
      const constraints = [];

      if (options.sourceId) {
        constraints.push(where("sourceId", "==", options.sourceId));
      }

      constraints.push(orderBy("publishedAt", "desc"));

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(storiesCollection, ...constraints);

      const storiesSnap = await getDocs(q);
      const stories: IStory[] = [];

      storiesSnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        stories.push({
          id: docSnap.id,
          headline: data.headline || data.title || "",
          summary: data.summary || data.description || "",
          url: data.url || data.link || "",
          imageUrl: data.imageUrl || data.image || "",
          newsSource: data.sourceId || "",
          publishedAt:
            data.publishedAt || data.createdAt || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
        } as IStory);
      });

      return {
        stories,
        totalCount: stories.length,
        hasMore: false,
        page: options.page || 1,
        limit: options.limit || 20,
      };
    } catch (error) {
      console.error("[StoryServerService] Error searching stories:", error);
      return {
        stories: [],
        totalCount: 0,
        hasMore: false,
        page: options.page || 1,
        limit: options.limit || 20,
      };
    }
  }

  /**
   * Mark a story as read by a user
   * Creates a story status record with read=true, starred=false
   * Uses composite document ID for uniqueness: userId-storyId
   */
  public async markStoryAsRead(
    userId: string,
    storyId: string
  ): Promise<boolean> {
    try {
      const statusId = `${userId}-${storyId}`;
      const now = new Date().toISOString();

      // Check if status already exists
      const statusDoc = doc(db, `newswithfriends/story_status/${statusId}`);
      const existingStatus = await getDoc(statusDoc);

      if (existingStatus.exists) {
        // Update existing status to mark as read
        await updateDoc(statusDoc, {
          read: true,
          updatedAt: now,
        });
      } else {
        // Create new status record
        const statusData: IStoryStatus = {
          userId,
          storyId,
          read: true,
          starred: false,
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(statusDoc, statusData);
      }

      return true;
    } catch (error) {
      console.error("[StoryServerService] Error marking story as read:", error);
      return false;
    }
  }

  /**
   * Toggle star status for a story
   * Creates or updates story status record with starred=true/false
   */
  public async toggleStoryStarred(
    userId: string,
    storyId: string,
    starred: boolean
  ): Promise<boolean> {
    try {
      const statusId = `${userId}-${storyId}`;
      const now = new Date().toISOString();

      // Check if status already exists
      const statusDoc = doc(db, `newswithfriends/story_status/${statusId}`);
      const existingStatus = await getDoc(statusDoc);

      if (existingStatus.exists) {
        // Update existing status
        await updateDoc(statusDoc, {
          starred,
          updatedAt: now,
        });
      } else {
        // Create new status record (story is being starred without being read first)
        const statusData: IStoryStatus = {
          userId,
          storyId,
          read: false, // Not read yet, just starred
          starred,
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(statusDoc, statusData);
      }

      return true;
    } catch (error) {
      console.error(
        "[StoryServerService] Error toggling story starred status:",
        error
      );
      return false;
    }
  }

  /**
   * Get story status for a specific user and story
   * Returns null if no status exists (presumed unread and unstarred)
   */
  public async getStoryStatus(
    userId: string,
    storyId: string
  ): Promise<IStoryStatus | null> {
    try {
      const statusId = `${userId}-${storyId}`;
      const statusDoc = doc(db, `newswithfriends/story_status/${statusId}`);
      const statusSnap = await getDoc(statusDoc);

      if (statusSnap.exists) {
        return statusSnap.data() as IStoryStatus;
      }

      return null; // No status = unread and unstarred
    } catch (error) {
      console.error("[StoryServerService] Error getting story status:", error);
      return null;
    }
  }
}

export const storyServerService = new StoryServerService();
