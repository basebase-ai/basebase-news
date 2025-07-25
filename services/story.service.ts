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
  db,
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

export interface IComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  };
  storyId: string;
}

export interface IStoryWithDetails extends IStory {
  starCount: number;
  starredBy: {
    id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  }[];
  comments: IComment[];
  source: {
    id: string;
    name: string;
    homepageUrl: string;
    imageUrl?: string;
  };
}

export class StoryService {
  private storyCache = new Map<
    string,
    { stories: IStory[]; timestamp: number }
  >();
  private statusCache = new Map<
    string,
    { status: IStoryStatus | null; timestamp: number }
  >();
  private friendStarredCache = new Map<
    string,
    { stories: IStoryWithDetails[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Use BaseBase SDK calls
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private getCachedStories(sourceId: string): IStory[] | null {
    const cached = this.storyCache.get(sourceId);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.stories;
    }
    return null;
  }

  private setCachedStories(sourceId: string, stories: IStory[]): void {
    this.storyCache.set(sourceId, {
      stories,
      timestamp: Date.now(),
    });
  }

  private getCachedStatus(
    userId: string,
    storyId: string
  ): IStoryStatus | null | undefined {
    const key = `${userId}-${storyId}`;
    const cached = this.statusCache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.status;
    }
    return undefined; // undefined means not cached, null means no status exists
  }

  private setCachedStatus(
    userId: string,
    storyId: string,
    status: IStoryStatus | null
  ): void {
    const key = `${userId}-${storyId}`;
    this.statusCache.set(key, {
      status,
      timestamp: Date.now(),
    });
  }

  private getCachedFriendStarredStories(
    friendIds: string[]
  ): IStoryWithDetails[] | null {
    const key = friendIds.sort().join(","); // Sort for consistent key
    const cached = this.friendStarredCache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.stories;
    }
    return null;
  }

  private setCachedFriendStarredStories(
    friendIds: string[],
    stories: IStoryWithDetails[]
  ): void {
    const key = friendIds.sort().join(","); // Sort for consistent key
    this.friendStarredCache.set(key, {
      stories,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all caches (useful for testing or forced refresh)
   */
  public clearCache(): void {
    this.storyCache.clear();
    this.statusCache.clear();
    this.friendStarredCache.clear();
  }

  /**
   * Clear cache for a specific source (useful after scraping)
   */
  public clearSourceCache(sourceId: string): void {
    this.storyCache.delete(sourceId);
  }

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
      const storyData = this.prepareStoryData(story, sourceId);
      const storiesCollection = collection(db, "newswithfriends/news_stories");
      const docRef = await addDoc(storiesCollection, storyData);

      return {
        ...story,
        id: docRef.id,
        createdAt: storyData.createdAt,
      };
    } catch (error) {
      console.error("Error adding story:", error);
      throw error;
    }
  }

  /**
   * Get basic stories for a source (cached)
   * @deprecated Use getStoriesWithStatus() for better performance with user data
   */
  public async getStories(sourceId: string): Promise<IStory[]> {
    try {
      console.log("getStories called for sourceId:", sourceId);

      // Check cache first
      const cached = this.getCachedStories(sourceId);
      if (cached) {
        console.log("Returning cached stories for", sourceId);
        return cached;
      }

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

      // Cache the results
      this.setCachedStories(sourceId, storyList);

      return storyList;
    } catch (error) {
      console.error("Error getting stories:", error);
      return [];
    }
  }

  /**
   * Get stories with user status efficiently (recommended method)
   * Bulk fetches statuses for better performance
   */
  public async getStoriesWithStatus(
    sourceId: string,
    userId?: string,
    limitCount: number = 50
  ): Promise<(IStory & { status?: "READ" | "UNREAD"; starred?: boolean })[]> {
    try {
      // Get basic stories (cached)
      const stories = await this.getStories(sourceId);
      const limitedStories = stories.slice(0, limitCount);

      if (!userId) {
        return limitedStories.map((story) => ({
          ...story,
          status: "UNREAD" as const,
          starred: false,
        }));
      }

      // Bulk fetch statuses for better performance
      const statusPromises = limitedStories.map(async (story) => {
        const cached = this.getCachedStatus(userId, story.id || "");
        if (cached !== undefined) {
          return cached;
        }

        try {
          const status = await this.getStoryStatus(userId, story.id || "");
          this.setCachedStatus(userId, story.id || "", status);
          return status;
        } catch (error) {
          console.error(`Error fetching status for story ${story.id}:`, error);
          return null;
        }
      });

      const statuses = await Promise.all(statusPromises);

      return limitedStories.map((story, index) => {
        const status = statuses[index];
        return {
          ...story,
          status: status?.read ? ("READ" as const) : ("UNREAD" as const),
          starred: status?.starred || false,
        };
      });
    } catch (error) {
      console.error("Error getting stories with status:", error);
      return [];
    }
  }

  /**
   * Get stories with full social context (comments, stars, etc.)
   * Renamed from getStoriesForSource for clarity
   */
  public async getStoriesWithSocialContext(
    sourceId: string,
    limitCount: number = 3
  ): Promise<IStoryWithDetails[]> {
    try {
      console.log("getStoriesWithSocialContext called for sourceId:", sourceId);

      // Use cached stories as base
      const baseStories = await this.getStories(sourceId);
      const limitedStories = baseStories.slice(0, limitCount);

      // Get source info
      const sourceDoc = await getDoc(
        doc(db, `newswithfriends/news_sources/${sourceId}`)
      );
      const sourceData = sourceDoc.exists ? sourceDoc.data() : null;

      const storiesWithDetails: IStoryWithDetails[] = [];

      for (const story of limitedStories) {
        // Get comments for this story
        const commentsCollection = collection(db, "newswithfriends/comments");
        const commentsQuery = query(
          commentsCollection,
          where("storyId", "==", story.id),
          orderBy("createdAt", "desc")
        );
        const commentsSnap = await commentsQuery.get();

        const comments: IComment[] = [];
        for (const commentDoc of commentsSnap.docs) {
          const commentData = commentDoc.data();
          // Get user info for comment
          const userDoc = await getDoc(
            doc(db, `basebase/users/${commentData.userId}`)
          );
          const userData = userDoc.exists ? userDoc.data() : null;

          if (userData) {
            const nameParts = userData.name.split(" ");
            comments.push({
              id: commentDoc.id,
              text: commentData.text,
              createdAt: commentData.createdAt,
              updatedAt: commentData.updatedAt,
              userId: {
                id: commentData.userId,
                first: nameParts[0] || "",
                last: nameParts.slice(1).join(" ") || "",
                email: userData.email || "",
                imageUrl: userData.imageUrl,
              },
              storyId: story.id || "",
            });
          }
        }

        // Get starred by info
        const starredCollection = collection(
          db,
          `newswithfriends/stories/${story.id}/starred`
        );
        const starredQuery = query(
          starredCollection,
          where("storyId", "==", story.id)
        );
        const starredSnap = await starredQuery.get();

        const starredBy: any[] = [];
        for (const starDoc of starredSnap.docs) {
          const starData = starDoc.data();
          const userDoc = await getDoc(
            doc(db, `basebase/users/${starData.userId}`)
          );
          const userData = userDoc.exists ? userDoc.data() : null;

          if (userData) {
            const nameParts = userData.name.split(" ");
            starredBy.push({
              id: starData.userId,
              first: nameParts[0] || "",
              last: nameParts.slice(1).join(" ") || "",
              email: userData.email || "",
              imageUrl: userData.imageUrl,
            });
          }
        }

        storiesWithDetails.push({
          ...story,
          starCount: starredBy.length,
          starredBy,
          comments,
          source: {
            id: sourceId,
            name: sourceData?.name || "Unknown Source",
            homepageUrl: sourceData?.homepageUrl || "",
            imageUrl: sourceData?.imageUrl,
          },
        });
      }

      return storiesWithDetails;
    } catch (error) {
      console.error("Error getting stories with social context:", error);
      return [];
    }
  }

  /**
   * @deprecated Use getStoriesWithSocialContext() instead
   */
  public async getStoriesForSource(
    sourceId: string,
    limitCount: number = 3
  ): Promise<IStoryWithDetails[]> {
    console.warn(
      "getStoriesForSource is deprecated, use getStoriesWithSocialContext instead"
    );
    return this.getStoriesWithSocialContext(sourceId, limitCount);
  }

  public async addComment(
    storyId: string,
    text: string,
    userId: string
  ): Promise<IComment | null> {
    try {
      const commentData = {
        storyId,
        text,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const commentsCollection = collection(db, "newswithfriends/comments");
      const docRef = await addDoc(commentsCollection, commentData);

      // Get user info
      const userDoc = await getDoc(doc(db, `basebase/users/${userId}`));
      const userData = userDoc.exists ? userDoc.data() : null;

      if (userData) {
        const nameParts = userData.name.split(" ");
        return {
          id: docRef.id,
          text,
          createdAt: commentData.createdAt,
          updatedAt: commentData.updatedAt,
          userId: {
            id: userId,
            first: nameParts[0] || "",
            last: nameParts.slice(1).join(" ") || "",
            email: userData.email || "",
            imageUrl: userData.imageUrl,
          },
          storyId,
        };
      }

      return null;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  public async starStory(
    storyId: string,
    userId: string,
    comment?: string
  ): Promise<boolean> {
    try {
      const starData = {
        storyId,
        userId,
        comment: comment || "",
        createdAt: new Date().toISOString(),
      };

      const starredCollection = collection(
        db,
        `newswithfriends/stories/${storyId}/starred`
      );
      await addDoc(starredCollection, starData);

      return true;
    } catch (error) {
      console.error("Error starring story:", error);
      return false;
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
        "searchStories called with query:",
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
      console.error("Error searching stories:", error);
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
      console.error("Error marking story as read:", error);
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
      console.error("Error toggling story starred status:", error);
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
      console.error("Error getting story status:", error);
      return null;
    }
  }

  /**
   * Get all story statuses for a user
   * Useful for getting read/starred status across multiple stories
   */
  public async getUserStoryStatuses(userId: string): Promise<IStoryStatus[]> {
    try {
      const statusCollection = collection(db, "newswithfriends/story_status");
      const q = query(
        statusCollection,
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );

      const statusSnap = await getDocs(q);
      const statuses: IStoryStatus[] = [];

      statusSnap.forEach((docSnap: any) => {
        statuses.push(docSnap.data() as IStoryStatus);
      });

      return statuses;
    } catch (error) {
      console.error("Error getting user story statuses:", error);
      return [];
    }
  }

  /**
   * Get all starred stories for a user
   */
  public async getStarredStories(userId: string): Promise<IStoryStatus[]> {
    try {
      const statusCollection = collection(db, "newswithfriends/story_status");
      const q = query(
        statusCollection,
        where("userId", "==", userId),
        where("starred", "==", true),
        orderBy("updatedAt", "desc")
      );

      const statusSnap = await getDocs(q);
      const statuses: IStoryStatus[] = [];

      statusSnap.forEach((docSnap: any) => {
        statuses.push(docSnap.data() as IStoryStatus);
      });

      return statuses;
    } catch (error) {
      console.error("Error getting starred stories:", error);
      return [];
    }
  }

  /**
   * Get recently starred stories by friends for the discover feed
   */
  public async getRecentlyStarredStoriesByFriends(
    friendIds: string[],
    limitCount: number = 50
  ): Promise<IStoryWithDetails[]> {
    try {
      if (friendIds.length === 0) {
        return [];
      }

      // Check cache first
      const cached = this.getCachedFriendStarredStories(friendIds);
      if (cached) {
        console.log("[Story Service] Returning cached friend starred stories");
        return cached.slice(0, limitCount); // Apply limit to cached results
      }

      console.log(
        "[Story Service] Getting recently starred stories for friends:",
        friendIds
      );

      // Get recent starred story statuses by friends
      const statusCollection = collection(db, "newswithfriends/story_status");
      const q = query(
        statusCollection,
        where("starred", "==", true),
        orderBy("updatedAt", "desc"),
        limit(limitCount * 2) // Get more to filter by friends
      );

      const statusSnap = await getDocs(q);
      const friendStarredStatuses: (IStoryStatus & { starredByUser?: any })[] =
        [];

      // Filter by friends and add user info
      for (const statusDoc of statusSnap.docs) {
        const statusData = statusDoc.data() as IStoryStatus;

        if (friendIds.includes(statusData.userId)) {
          // Get user info for the friend who starred this
          const userDoc = await getDoc(
            doc(db, `basebase/users/${statusData.userId}`)
          );
          const userData = userDoc.exists ? userDoc.data() : null;

          if (userData) {
            const nameParts = userData.name.split(" ");
            friendStarredStatuses.push({
              ...statusData,
              starredByUser: {
                id: statusData.userId,
                first: nameParts[0] || "",
                last: nameParts.slice(1).join(" ") || "",
                email: userData.email || "",
                imageUrl: userData.imageUrl,
              },
            });
          }
        }
      }

      // Limit to requested count
      const limitedStatuses = friendStarredStatuses.slice(0, limitCount);

      console.log(
        `[Story Service] Found ${limitedStatuses.length} recently starred stories by friends`
      );

      // Fetch story details for each starred story
      const storiesWithDetails: IStoryWithDetails[] = [];

      for (const status of limitedStatuses) {
        try {
          // Get the story
          const storyDoc = await getDoc(
            doc(db, `newswithfriends/news_stories/${status.storyId}`)
          );

          if (!storyDoc.exists) {
            console.warn(`[Story Service] Story ${status.storyId} not found`);
            continue;
          }

          const storyData = storyDoc.data();

          if (!storyData) {
            console.warn(
              `[Story Service] Story data is null for ${status.storyId}`
            );
            continue;
          }

          // Get source info
          const sourceDoc = await getDoc(
            doc(db, `newswithfriends/news_sources/${storyData.sourceId}`)
          );
          const sourceData = sourceDoc.exists ? sourceDoc.data() : null;

          // Get comments for this story
          const commentsCollection = collection(db, "newswithfriends/comments");
          const commentsQuery = query(
            commentsCollection,
            where("storyId", "==", status.storyId),
            orderBy("createdAt", "desc")
          );
          const commentsSnap = await getDocs(commentsQuery);

          const comments: IComment[] = [];
          for (const commentDoc of commentsSnap.docs) {
            const commentData = commentDoc.data();
            const userDoc = await getDoc(
              doc(db, `basebase/users/${commentData.userId}`)
            );
            const userData = userDoc.exists ? userDoc.data() : null;

            if (userData) {
              const nameParts = userData.name.split(" ");
              comments.push({
                id: commentDoc.id,
                text: commentData.text,
                createdAt: commentData.createdAt,
                updatedAt: commentData.updatedAt,
                userId: {
                  id: commentData.userId,
                  first: nameParts[0] || "",
                  last: nameParts.slice(1).join(" ") || "",
                  email: userData.email || "",
                  imageUrl: userData.imageUrl,
                },
                storyId: status.storyId,
              });
            }
          }

          // Build the story with details
          const storyWithDetails: IStoryWithDetails = {
            id: status.storyId,
            headline: storyData.headline || "",
            summary: storyData.summary || "",
            url: storyData.url || "",
            imageUrl: storyData.imageUrl,
            newsSource: storyData.sourceId || "",
            publishedAt:
              storyData.publishedAt ||
              storyData.createdAt ||
              new Date().toISOString(),
            createdAt: storyData.createdAt || new Date().toISOString(),
            starCount: 1, // At least this friend starred it
            starredBy: [status.starredByUser], // The friend who starred it
            comments,
            source: {
              id: storyData.sourceId || "",
              name: sourceData?.name || "Unknown Source",
              homepageUrl: sourceData?.homepageUrl || "",
              imageUrl: sourceData?.imageUrl,
            },
          };

          storiesWithDetails.push(storyWithDetails);
        } catch (error) {
          console.error(
            `[Story Service] Error fetching story details for ${status.storyId}:`,
            error
          );
        }
      }

      console.log(
        `[Story Service] Returning ${storiesWithDetails.length} stories with details`
      );

      // Cache the results
      this.setCachedFriendStarredStories(friendIds, storiesWithDetails);

      return storiesWithDetails;
    } catch (error) {
      console.error(
        "Error getting recently starred stories by friends:",
        error
      );
      return [];
    }
  }
}

export const storyService = new StoryService();
