import { gql } from "graphql-request";
import { basebaseService } from "./basebase.service";

// Define interfaces based on BaseBase types
export interface IStory {
  id?: string;
  creator?: string;
  headline: string;
  summary?: string;
  url?: string;
  articleUrl?: string; // Legacy field, maps to url
  imageUrl?: string;
  newsSource?: string;
  // Additional fields we'll store in metadata
  fullHeadline?: string;
  fullText?: string;
  section?: string;
  type?: string;
  authorNames?: string[];
  inPageRank?: number | null;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: string;
}

interface IStoryStatus {
  userId: string;
  storyId: string;
  status: "READ" | "UNREAD";
  starred: boolean;
}

// GraphQL response types
interface GetAllNewsStoriesResponse {
  data: {
    getAllNewsStorys: IStory[];
  };
}

interface CreateNewsStoryResponse {
  data: {
    createNewsStory: IStory;
  };
}

interface UpdateNewsStoryResponse {
  data: {
    updateNewsStory: IStory;
  };
}

// GraphQL Queries and Mutations
const CREATE_STORY = gql`
  mutation CreateNewsStory($input: CreateNewsStoryInput!) {
    createNewsStory(input: $input) {
      id
      creator
      headline
      summary
      url
      imageUrl
      newsSource
    }
  }
`;

const UPDATE_STORY = gql`
  mutation UpdateNewsStory($id: ID!, $input: UpdateNewsStoryInput!) {
    updateNewsStory(id: $id, input: $input) {
      id
      creator
      headline
      summary
      url
      imageUrl
      newsSource
    }
  }
`;

const GET_STORY = gql`
  query GetNewsStory($id: ID!) {
    getNewsStory(id: $id) {
      id
      creator
      headline
      summary
      url
      imageUrl
      newsSource
    }
  }
`;

const GET_ALL_STORIES = gql`
  query GetAllNewsStories {
    getAllNewsStorys {
      id
      creator
      headline
      summary
      url
      imageUrl
      newsSource
    }
  }
`;

export class StoryService {
  constructor() {}

  private prepareStoryData(story: IStory, sourceId: string): any {
    const metadata = {
      fullHeadline: story.fullHeadline,
      fullText: story.fullText,
      section: story.section,
      type: story.type,
      authorNames: story.authorNames,
      inPageRank: story.inPageRank,
      archived: story.archived || false,
      createdAt: story.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      headline: story.headline || story.fullHeadline,
      summary: story.summary,
      url: story.url || story.articleUrl,
      imageUrl: story.imageUrl,
      newsSource: sourceId,
      metadata: JSON.stringify(metadata),
    };
  }

  public async addStory(
    sourceId: string,
    story: IStory,
    rank?: number
  ): Promise<IStory> {
    // First check if story already exists by URL
    const allStories =
      await basebaseService.graphql<GetAllNewsStoriesResponse>(GET_ALL_STORIES);
    const existingStory = allStories.data.getAllNewsStorys.find(
      (s) =>
        s.url === (story.url || story.articleUrl) && s.newsSource === sourceId
    );

    if (existingStory) {
      // Update existing story
      const storyData = this.prepareStoryData(story, sourceId);
      if (rank !== undefined) {
        storyData.metadata = JSON.stringify({
          ...JSON.parse(storyData.metadata),
          inPageRank: rank,
        });
      }

      const result = await basebaseService.graphql<UpdateNewsStoryResponse>(
        UPDATE_STORY,
        {
          id: existingStory.id,
          input: storyData,
        }
      );

      return result.data.updateNewsStory;
    } else {
      // Create new story
      const storyData = this.prepareStoryData(story, sourceId);
      if (rank !== undefined) {
        storyData.metadata = JSON.stringify({
          ...JSON.parse(storyData.metadata),
          inPageRank: rank,
        });
      }

      const result = await basebaseService.graphql<CreateNewsStoryResponse>(
        CREATE_STORY,
        {
          input: storyData,
        }
      );

      return result.data.createNewsStory;
    }
  }

  public async getStories(
    sourceId: string,
    userId?: string
  ): Promise<IStory[]> {
    const MAX_STORIES = 25;

    // Get all stories for this source
    const response =
      await basebaseService.graphql<GetAllNewsStoriesResponse>(GET_ALL_STORIES);
    let stories = response.data.getAllNewsStorys.filter(
      (story) =>
        story.newsSource === sourceId &&
        !JSON.parse(story.metadata || "{}").archived
    );

    // Sort by inPageRank if available, then by date
    stories.sort((a, b) => {
      const metaA = JSON.parse(a.metadata || "{}");
      const metaB = JSON.parse(b.metadata || "{}");
      const rankA = metaA.inPageRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = metaB.inPageRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return (
        new Date(metaB.createdAt).getTime() -
        new Date(metaA.createdAt).getTime()
      );
    });

    return stories.slice(0, MAX_STORIES);
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
    const { sourceId, before, after, page = 1, limit = 20 } = options;

    // Get all stories and filter in memory since BaseBase doesn't support text search yet
    const response =
      await basebaseService.graphql<GetAllNewsStoriesResponse>(GET_ALL_STORIES);
    let stories = response.data.getAllNewsStorys;

    // Apply filters
    if (sourceId) {
      stories = stories.filter((story) => story.newsSource === sourceId);
    }

    if (before) {
      stories = stories.filter((story) => {
        const metadata = JSON.parse(story.metadata || "{}");
        return new Date(metadata.createdAt) < before;
      });
    }

    if (after) {
      stories = stories.filter((story) => {
        const metadata = JSON.parse(story.metadata || "{}");
        return new Date(metadata.createdAt) > after;
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
      const metaA = JSON.parse(a.metadata || "{}");
      const metaB = JSON.parse(b.metadata || "{}");
      return (
        new Date(metaB.createdAt).getTime() -
        new Date(metaA.createdAt).getTime()
      );
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
  }
}

export const storyService = new StoryService();
