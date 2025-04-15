import { connectDB } from "../src/services/mongo.service";
import { headlineService } from "../src/services/headline.service";
import { ISource } from "../src/models/source.model";

export const SOURCES: Record<string, ISource> = {
  nytimes: {
    name: "The New York Times",
    homepageUrl: "https://www.nytimes.com",
    cssSelector: "main#site-content",
    biasScore: -8.09,
  },
  wsj: {
    name: "The Wall Street Journal",
    homepageUrl: "https://www.wsj.com",
    cssSelector: "main.css-15bumpt",
    biasScore: 4.5,
  },
  wapo: {
    name: "The Washington Post",
    homepageUrl: "https://www.washingtonpost.com",
    cssSelector: "main#main-content",
    biasScore: -6.97,
  },
  latimes: {
    name: "Los Angeles Times",
    homepageUrl: "https://www.latimes.com",
    cssSelector: "main.page-main",
    biasScore: -6.37,
  },
  foxnews: {
    name: "Fox News",
    homepageUrl: "https://www.foxnews.com",
    cssSelector: "main.main-content",
    biasScore: 18.07,
  },
};

async function addSources(): Promise<void> {
  await connectDB();
  for (const key of Object.keys(SOURCES)) {
    const source: ISource | undefined = SOURCES[key];
    if (source) {
      try {
        await headlineService.addSource(source);
        console.log(`Added source: ${source.name}`);
      } catch (error) {
        console.error(`Failed to add source ${source.name}:`, error);
      }
    }
  }
  process.exit(0);
}

addSources();
