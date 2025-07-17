export interface User {
  id: string;
  first: string;
  last: string;
  phone?: string;
  imageUrl?: string;
  email: string;
  sourceIds: string[];
  denseMode: boolean;
  darkMode: boolean;
}

export interface UserConnection {
  from: string; // User ID who initiated the connection
  to: string; // User ID being connected to
  type: "friend" | "follow" | "block"; // Connection type
  createdAt: string; // When connection was created
  projectId: string; // Project identifier for this connection
}

export interface Source {
  id: string;
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  includeSelector?: string;
  excludeSelector?: string;
  biasScore?: number;
  tags?: string[];
  imageUrl?: string;
  lastScrapedAt?: string;
  hasPaywall?: boolean;
}

export interface Story {
  id: string;
  articleUrl: string;
  fullHeadline: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  imageUrl?: string;
  status?: "READ" | "UNREAD";
  starred?: boolean;
  publishedAt?: string;
}

export interface IStoryStatus {
  userId: string;
  storyId: string;
  read: boolean;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}
