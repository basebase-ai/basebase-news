export enum Section {
  NEWS = "news",
  OPINION = "opinion",
  SPORTS = "sports",
  ENTERTAINMENT = "entertainment",
  LIFESTYLE = "lifestyle",
}

// these are topics inside the news section
export enum NewsTopic {
  US_POLITICS = "us politics",
  WORLD_POLITICS = "world politics",
  FINANCE_ECONOMICS = "finance & economics",
  BUSINESS = "business",
  SCIENCE_TECHNOLOGY = "science & technology",
  HEALTH = "health",
}

export interface IHeadline {
  fullHeadline: string;
  articleUrl: string;
  section: Section;
  type: NewsTopic;
  sourceId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
