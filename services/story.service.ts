import { gql } from "graphql-request";
import { basebaseService } from "./basebase.service";

// Define interfaces based on BaseBase types
export interface IStory {
  id?: string;
  creator: {
    id: string;
    name: string;
  };
  headline: string;
  summary: string;
  url: string;
  imageUrl: string;
  newsSource: string;
  createdAt: string;
  updatedAt: string;
}

interface IStoryStatus {
  userId: string;
  storyId: string;
  status: "READ" | "UNREAD";
  starred: boolean;
}

// GraphQL response types
interface GetAllNewsStoriesResponse {
  getNewsStorys: IStory[];
}

interface GetNewsStoryResponse {
  getNewsStory: IStory;
}

interface CreateNewsStoryResponse {
  createNewsStory: IStory;
}

interface UpdateNewsStoryResponse {
  updateNewsStory: IStory;
}

// GraphQL Queries and Mutations
const CREATE_STORY = gql`
  mutation CreateNewsStory($input: NewsStoryInput!) {
    createNewsStory(input: $input) {
      id
      creator {
        id
        name
      }
      headline
      summary
      url
      imageUrl
      newsSource
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_STORY = gql`
  mutation UpdateNewsStory($id: ID!, $input: NewsStoryInput!) {
    updateNewsStory(id: $id, input: $input) {
      id
      creator {
        id
        name
      }
      headline
      summary
      url
      imageUrl
      newsSource
      createdAt
      updatedAt
    }
  }
`;

const GET_STORY = gql`
  query GetNewsStory($id: ID!) {
    getNewsStory(id: $id) {
      id
      creator {
        id
        name
      }
      headline
      summary
      url
      imageUrl
      newsSource
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_STORIES = gql`
  query GetNewsStorys {
    getNewsStorys {
      id
      creator {
        id
        name
      }
      headline
      summary
      url
      imageUrl
      newsSource
      createdAt
      updatedAt
    }
  }
`;

export class StoryService {
  constructor() {}

  private prepareStoryData(story: IStory, sourceId: string): any {
    return {
      headline: story.headline,
      summary: story.summary || "No summary available",
      url: story.url,
      imageUrl: story.imageUrl || "https://via.placeholder.com/300",
      newsSource: sourceId, // This should be the ID of the NewsSource
    };
  }

  public async addStory(sourceId: string, story: IStory): Promise<IStory> {
    const storyData = this.prepareStoryData(story, sourceId);
    const result = await basebaseService.graphql<CreateNewsStoryResponse>(
      CREATE_STORY,
      {
        input: storyData,
      }
    );

    return result.createNewsStory;
  }

  public async getStories(sourceId: string): Promise<IStory[]> {
    const MAX_STORIES = 25;

    // Get all stories for this source
    const response =
      await basebaseService.graphql<GetAllNewsStoriesResponse>(GET_ALL_STORIES);
    let stories = response.getNewsStorys.filter(
      (story) => story.newsSource === sourceId
    );

    // Sort by date
    stories.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
    let stories = response.getNewsStorys;

    // Apply filters
    if (sourceId) {
      stories = stories.filter((story) => story.newsSource === sourceId);
    }

    if (before) {
      stories = stories.filter((story) => {
        return new Date(story.createdAt) < before;
      });
    }

    if (after) {
      stories = stories.filter((story) => {
        return new Date(story.createdAt) > after;
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
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
