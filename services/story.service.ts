import { fetchApi } from "@/lib/api";

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

interface IStoryStatus {
  userId: string;
  storyId: string;
  status: "READ" | "UNREAD";
  starred: boolean;
  newsSource: {
    id: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class StoryService {
  constructor() {
    // Use API endpoints instead of direct BaseBase SDK calls
  }

  private prepareStoryData(story: IStory, sourceId: string): any {
    return {
      headline: story.headline,
      summary: story.summary || "No summary available",
      url: story.url,
      imageUrl: story.imageUrl || "https://via.placeholder.com/300",
      newsSource: sourceId,
      publishedAt: story.publishedAt,
      createdAt: new Date().toISOString(),
    };
  }

  public async addStory(sourceId: string, story: IStory): Promise<IStory> {
    try {
      const db = this.getAuthenticatedDb();
      const storyData = this.prepareStoryData(story, sourceId);
      const storiesCollection = collection(
        db,
        "newsStories",
        "newswithfriends"
      );
      const storyRef = await addDoc(storiesCollection, storyData);

      return {
        id: storyRef.id,
        ...storyData,
        newsSource: sourceId,
      };
    } catch (error) {
      console.error("Error adding story:", error);
      throw error;
    }
  }

  public async getStories(sourceId: string): Promise<IStory[]> {
    try {
      const db = this.getAuthenticatedDb();
      const MAX_STORIES = 25;
      const storiesCollection = collection(
        db,
        "newsStories",
        "newswithfriends"
      );
      const storiesSnap = await getDocs(storiesCollection);

      const stories: IStory[] = [];
      storiesSnap.forEach((doc) => {
        const storyData = doc.data();
        if (storyData.newsSource === sourceId) {
          stories.push({ id: doc.id, ...storyData } as IStory);
        }
      });

      // Sort by date
      stories.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.publishedAt).getTime();
        const dateB = new Date(b.createdAt || b.publishedAt).getTime();
        return dateB - dateA;
      });

      return stories.slice(0, MAX_STORIES);
    } catch (error) {
      console.error("Error getting stories:", error);
      throw error;
    }
  }

  public async searchStories(
    query: string | null,
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
      const { sourceId, before, after, page = 1, limit = 20 } = options;

      // Get all stories and filter in memory since BaseBase doesn't support text search yet
      const db = this.getAuthenticatedDb();
      const storiesCollection = collection(
        db,
        "newsStories",
        "newswithfriends"
      );
      const storiesSnap = await getDocs(storiesCollection);

      let stories: IStory[] = [];
      storiesSnap.forEach((doc) => {
        stories.push({ id: doc.id, ...doc.data() } as IStory);
      });

      // Apply filters
      if (sourceId) {
        stories = stories.filter((story) => story.newsSource === sourceId);
      }

      if (before) {
        stories = stories.filter((story) => {
          const storyDate = new Date(story.createdAt || story.publishedAt);
          return storyDate < before;
        });
      }

      if (after) {
        stories = stories.filter((story) => {
          const storyDate = new Date(story.createdAt || story.publishedAt);
          return storyDate > after;
        });
      }

      if (query) {
        const searchTerms = query.toLowerCase().split(" ");
        stories = stories.filter((story) => {
          const searchText = `${story.headline} ${story.summary}`.toLowerCase();
          return searchTerms.every((term) => searchText.includes(term));
        });
      }

      // Sort by date
      stories.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.publishedAt).getTime();
        const dateB = new Date(b.createdAt || b.publishedAt).getTime();
        return dateB - dateA;
      });

      const totalCount = stories.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedStories = stories.slice(startIndex, endIndex);

      return {
        stories: paginatedStories,
        totalCount,
        hasMore: endIndex < totalCount,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error searching stories:", error);
      throw error;
    }
  }
}

export const storyService = new StoryService();
