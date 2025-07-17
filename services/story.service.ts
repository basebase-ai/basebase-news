import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  db,
} from "basebase-js";

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
  constructor() {
    // Use BaseBase SDK calls
  }

  private prepareStoryData(story: IStory, sourceId: string): any {
    return {
      headline: story.headline,
      summary: story.summary || "No summary available",
      url: story.url,
      imageUrl: story.imageUrl || "https://via.placeholder.com/300",
      sourceId: sourceId,
      publishedAt: story.publishedAt,
      createdAt: new Date().toISOString(),
    };
  }

  public async addStory(sourceId: string, story: IStory): Promise<IStory> {
    try {
      const storyData = this.prepareStoryData(story, sourceId);
      const storiesCollection = collection(db, "newswithfriends/newsStories");
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

  public async getStories(sourceId: string): Promise<IStory[]> {
    try {
      console.log("getStories called for sourceId:", sourceId);

      const storiesCollection = collection(db, "newswithfriends/newsStories");

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

      return storyList;
    } catch (error) {
      console.error("Error getting stories:", error);
      return [];
    }
  }

  public async getStoriesForSource(
    sourceId: string,
    limitCount: number = 3
  ): Promise<IStoryWithDetails[]> {
    try {
      console.log("getStoriesForSource called for sourceId:", sourceId);

      const storiesCollection = collection(db, "newswithfriends/newsStories");
      const q = query(
        storiesCollection,
        where("sourceId", "==", sourceId),
        orderBy("publishedAt", "desc"),
        limit(limitCount)
      );

      const storiesSnap = await q.get();
      const stories: IStoryWithDetails[] = [];

      // Get source info
      const sourceDoc = await getDoc(
        doc(db, `newswithfriends/newsSources/${sourceId}`)
      );
      const sourceData = sourceDoc.exists ? sourceDoc.data() : null;

      for (const docSnap of storiesSnap.docs) {
        const storyData = docSnap.data();

        // Get comments for this story
        const commentsCollection = collection(db, "newswithfriends/comments");
        const commentsQuery = query(
          commentsCollection,
          where("storyId", "==", docSnap.id),
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
          const userNewsDoc = await getDoc(
            doc(db, `newswithfriends/users/${commentData.userId}`)
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
              storyId: docSnap.id,
            });
          }
        }

        // Get starred by info
        const starredCollection = collection(
          db,
          `newswithfriends/stories/${docSnap.id}/starred`
        );
        const starredQuery = query(
          starredCollection,
          where("storyId", "==", docSnap.id)
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

        stories.push({
          id: docSnap.id,
          headline: storyData.headline,
          summary: storyData.summary,
          url: storyData.url,
          imageUrl: storyData.imageUrl,
          newsSource: storyData.newsSource,
          publishedAt: storyData.publishedAt,
          createdAt: storyData.createdAt,
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

      return stories;
    } catch (error) {
      console.error("Error getting stories for source:", error);
      return [];
    }
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

      const storiesCollection = collection(db, "newswithfriends/newsStories");

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
}

export const storyService = new StoryService();
