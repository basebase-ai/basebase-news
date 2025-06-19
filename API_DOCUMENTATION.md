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

### How to Obtain a JWT Token

The authentication system uses a passwordless magic link approach. Follow these steps to get a JWT token:

#### Step 1: Sign In Request

Send a POST request to initiate the sign-in process:

```bash
curl -X POST https://yourapi.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "first": "John",
    "last": "Doe",
    "phone": "(555) 123-4567",
    "email": "john@example.com"
  }'
```

**Request Parameters:**

- **`first`** (required): User's first name
- **`last`** (required): User's last name
- **`phone`** (optional): Phone number for SMS verification
- **`email`** (optional): Email address for email verification

**Note:** You must provide either a phone number, email address, or both.

**Response:**

```json
{
  "status": "ok",
  "message": "Sign-in email sent"
}
```

#### Step 2: Verification

After Step 1, you'll receive a verification message via SMS or email containing a magic link in this format:

```
https://yourapi.com/auth/verify?code=ABC123
```

#### Step 3: Get JWT Token

To programmatically obtain the JWT token, extract the verification code from the magic link and make a GET request to the verification endpoint:

```bash
curl -X GET "https://yourapi.com/api/auth/verify?code=ABC123" \
  -H "Accept: application/json"
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Authentication successful"
}
```

#### Step 4: Use the Token

Use the returned JWT token in the Authorization header for all API requests:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  "https://yourapi.com/api/stories/search?query=politics"
```

### Token Details

- **Expiration**: JWT tokens are valid for 365 days
- **Format**: Standard JWT format with HS256 algorithm
- **Storage**: Store securely in your application (localStorage for web apps, secure storage for mobile)
- **Verification**: Tokens are verified on each API request

### Authentication Flow Example (JavaScript)

```javascript
// Step 1: Sign in
async function signIn(firstName, lastName, email, phone) {
  const response = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first: firstName,
      last: lastName,
      email: email,
      phone: phone,
    }),
  });

  const data = await response.json();
  if (data.status === "ok") {
    console.log("Verification message sent!");
    // User should check their SMS/email for the magic link
  }
}

// Step 3: Verify and get token (when user clicks magic link)
async function verifyCode(code) {
  const response = await fetch(`/api/auth/verify?code=${code}`, {
    headers: { Accept: "application/json" },
  });

  const data = await response.json();
  if (data.token) {
    // Store the token securely
    localStorage.setItem("auth_token", data.token);
    return data.token;
  }
  throw new Error(data.error || "Verification failed");
}

// Step 4: Use token for API calls
async function searchStories(query) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(
    `/api/stories/search?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}
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
  "https://newswithfriends.org/api/stories/search?query=climate%20change"
```

### Search with Source Filter

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://newswithfriends.org/api/stories/search?query=politics&sourceId=507f1f77bcf86cd799439011"
```

### Search with Date Range

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://newswithfriends.org/api/stories/search?query=technology&after=2024-01-01T00:00:00Z&before=2024-01-31T23:59:59Z"
```

### Search with Pagination

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://newswithfriends.org/api/stories/search?query=sports&page=2&limit=10"
```

### Complex Search with All Filters

```bash
curl -H "Authorization: Bearer <your_token>" \
  "https://newswithfriends.org/api/stories/search?query=artificial%20intelligence&sourceId=507f1f77bcf86cd799439011&after=2024-01-01T00:00:00Z&page=1&limit=25"
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
