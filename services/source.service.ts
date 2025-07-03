import { gql } from "graphql-request";
import { basebaseService } from "./basebase.service";

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

// GraphQL response types
interface GetAllNewsSourcesResponse {
  getNewsSources: ISource[];
}

interface GetNewsSourceResponse {
  data: {
    getNewsSource: ISource;
  };
}

interface CreateNewsSourceResponse {
  data: {
    createNewsSource: ISource;
  };
}

interface UpdateNewsSourceResponse {
  data: {
    updateNewsSource: ISource;
  };
}

// GraphQL Queries and Mutations
const CREATE_SOURCE = gql`
  mutation CreateNewsSource($input: NewsSourceInput!) {
    createNewsSource(input: $input) {
      id
      name
      creator {
        id
        name
      }
      homepageUrl
      rssUrl
      lastScrapedAt
    }
  }
`;

const UPDATE_SOURCE = gql`
  mutation UpdateNewsSource($id: ID!, $input: NewsSourceInput!) {
    updateNewsSource(id: $id, input: $input) {
      id
      name
      creator {
        id
        name
      }
      homepageUrl
      rssUrl
      lastScrapedAt
    }
  }
`;

const GET_SOURCE = gql`
  query GetNewsSource($id: ID!) {
    getNewsSource(id: $id) {
      id
      name
      creator {
        id
        name
      }
      homepageUrl
      rssUrl
      lastScrapedAt
    }
  }
`;

const GET_ALL_SOURCES = gql`
  query GetNewsSources {
    getNewsSources {
      id
      name
      creator {
        id
        name
      }
      homepageUrl
      rssUrl
      lastScrapedAt
    }
  }
`;

export class SourceService {
  constructor() {}

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
    const trimmedSource = this.trimSourceFields(source);

    await basebaseService.graphql<CreateNewsSourceResponse>(CREATE_SOURCE, {
      input: trimmedSource,
    });
  }

  public async updateSource(sourceId: string, source: ISource): Promise<void> {
    const trimmedSource = this.trimSourceFields(source);

    try {
      await basebaseService.graphql<UpdateNewsSourceResponse>(UPDATE_SOURCE, {
        id: sourceId,
        input: trimmedSource,
      });
    } catch (error) {
      throw new Error(`Source with id ${sourceId} not found`);
    }
  }

  public async getSource(id: string): Promise<ISource> {
    try {
      const response = await basebaseService.graphql<GetNewsSourceResponse>(
        GET_SOURCE,
        { id }
      );
      return response.data.getNewsSource;
    } catch (error) {
      throw new Error(`Source with id ${id} not found`);
    }
  }

  public async getSources(): Promise<ISource[]> {
    try {
      const response =
        await basebaseService.graphql<GetAllNewsSourcesResponse>(
          GET_ALL_SOURCES
        );
      return response.getNewsSources;
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
    const response =
      await basebaseService.graphql<GetAllNewsSourcesResponse>(GET_ALL_SOURCES);
    const sources = response.data.getNewsSources;

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
