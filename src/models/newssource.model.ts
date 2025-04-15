export interface INewsSource {
  name: string;
  homepageUrl: string;
  cssSelector: string;
}

export const NEWS_SOURCES: Record<string, INewsSource> = {
  nytimes: {
    name: "The New York Times",
    homepageUrl: "https://www.nytimes.com",
    cssSelector: "main#site-content",
  },
  wsj: {
    name: "The Wall Street Journal",
    homepageUrl: "https://www.wsj.com",
    cssSelector: "main.css-15bumpt",
  },
  wapo: {
    name: "The Washington Post",
    homepageUrl: "https://www.washingtonpost.com",
    cssSelector: "main#main-content",
  },
  latimes: {
    name: "Los Angeles Times",
    homepageUrl: "https://www.latimes.com",
    cssSelector: "main.page-main",
  },
};
