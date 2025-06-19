# Story Search API Documentation

## Overview

The Story Search API allows authenticated users to search through stories using text queries with optional filtering and pagination capabilities.

## Endpoint

```
GET /api/stories/search
```

## Authentication

This endpoint requires authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Query Parameters

### Required Parameters

- **`query`** (string): The search term to match against story headlines, summaries, and full text content

### Optional Parameters

- **`sourceId`** (string): Filter results to stories from a specific source (MongoDB ObjectId)
- **`before`** (string): Filter stories created before this date (ISO 8601 format, e.g., `2024-01-15T10:30:00Z`)
- **`after`** (string): Filter stories created after this date (ISO 8601 format, e.g., `2024-01-01T00:00:00Z`)
- **`page`** (number): Page number for pagination (default: 1, minimum: 1)
- **`limit`** (number): Number of results per page (default: 20, minimum: 1, maximum: 100)

## Response Format

### Success Response (200 OK)

```json
{
  "status": "ok",
  "data": {
    "stories": [
      {
        "id": "story_id_here",
        "url": "https://example.com/article",
        "headline": "Article headline",
        "summary": "Article summary text",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "source": {
          "id": "source_id_here",
          "name": "Source Name",
          "homepage": "https://example.com",
          "imageUrl": "https://example.com/logo.png",
          "biasScore": 0.2,
          "tags": ["politics", "news"]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 150,
      "hasMore": true
    },
    "query": "search term",
    "filters": {
      "sourceId": "source_id_or_null",
      "before": "2024-01-15T10:30:00.000Z",
      "after": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Not authenticated"
}
```

#### 400 Bad Request

```json
{
  "status": "error",
  "message": "Query parameter is required"
}
```

```json
{
  "status": "error",
  "message": "Invalid 'before' date format"
}
```

```json
{
  "status": "error",
  "message": "Page must be a positive integer"
}
```

```json
{
  "status": "error",
  "message": "Limit must be between 1 and 100"
}
```

#### 500 Server Error

```json
{
  "status": "error",
  "message": "Server error"
}
```

## Usage Examples

### Basic Search

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://yourapi.com/api/stories/search?query=climate%20change"
```

### Search with Source Filter

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://yourapi.com/api/stories/search?query=politics&sourceId=507f1f77bcf86cd799439011"
```

### Search with Date Range

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://yourapi.com/api/stories/search?query=technology&after=2024-01-01T00:00:00Z&before=2024-01-31T23:59:59Z"
```

### Search with Pagination

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://yourapi.com/api/stories/search?query=sports&page=2&limit=10"
```

### Complex Search with All Filters

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://yourapi.com/api/stories/search?query=artificial%20intelligence&sourceId=507f1f77bcf86cd799439011&after=2024-01-01T00:00:00Z&page=1&limit=25"
```

## JavaScript/TypeScript Example

```typescript
interface SearchResponse {
  status: string;
  data: {
    stories: Story[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      hasMore: boolean;
    };
    query: string;
    filters: {
      sourceId: string | null;
      before: string | null;
      after: string | null;
    };
  };
}

interface Story {
  id: string;
  url: string;
  headline: string;
  summary: string;
  createdAt: string;
  source: Source;
}

interface Source {
  id: string;
  name: string;
  homepage: string;
  imageUrl?: string;
  biasScore?: number;
  tags: string[];
}

async function searchStories(
  query: string,
  options: {
    sourceId?: string;
    before?: string;
    after?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<SearchResponse> {
  const params = new URLSearchParams({ query });

  if (options.sourceId) params.append("sourceId", options.sourceId);
  if (options.before) params.append("before", options.before);
  if (options.after) params.append("after", options.after);
  if (options.page) params.append("page", options.page.toString());
  if (options.limit) params.append("limit", options.limit.toString());

  const response = await fetch(`/api/stories/search?${params}`, {
    headers: {
      Authorization: `Bearer ${your_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Usage examples
const results = await searchStories("climate change");
const filteredResults = await searchStories("politics", {
  sourceId: "507f1f77bcf86cd799439011",
  after: "2024-01-01T00:00:00Z",
  page: 1,
  limit: 10,
});
```

## Search Behavior

- **Text Matching**: The search query matches against story headlines, summaries, and full text content using case-insensitive regex matching
- **Sorting**: Results are sorted in reverse chronological order by `createdAt` (newest first)
- **Filtering**: Only non-archived stories are included in search results
- **Pagination**: Results are paginated with configurable page size

## Rate Limiting

Currently, no rate limiting is implemented, but it's recommended to implement appropriate rate limiting for production use.

## Notes

- All dates should be in ISO 8601 format
- The `sourceId` parameter should be a valid MongoDB ObjectId
- Search queries are case-insensitive
- Empty or whitespace-only queries will return a 400 error
- Maximum limit per page is 100 stories
