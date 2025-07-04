export interface User {
  _id: string;
  first: string;
  last: string;
  phone?: string;
  imageUrl?: string;
  email: string;
  isAdmin: boolean;
  sourceIds: string[];
  denseMode: boolean;
  darkMode: boolean;
}

export interface Source {
  _id: string;
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  includeSelector?: string;
  excludeSelector?: string;
  biasScore?: number;
  tags?: string[];
  imageUrl?: string;
  lastScrapedAt?: string;
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
