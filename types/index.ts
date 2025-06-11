export interface User {
  _id: string;
  first: string;
  last: string;
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
  authorNames?: string[];
  section?: string;
  type?: string;
  inPageRank?: number;
  status?: "READ" | "UNREAD";
  starred?: boolean;
  createdAt?: string;
}
