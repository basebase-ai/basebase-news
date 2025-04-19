import { ScrapingBeeClient } from "scrapingbee";
import * as cheerio from "cheerio";
import { ISource, Source } from "../models/source.model";
import { IStory, NewsTopic, Section } from "../models/story.model";
import { langChainService } from "./langchain.service";
import { storyService } from "./story.service";
import { previewService } from "./preview.service";
import Parser from "rss-parser";
import mongoose from "mongoose";

export class ScraperService {
  private readonly client: ScrapingBeeClient;
  private readonly apiKey: string;
  private readonly MAX_TOKENS: number = 100000;
  private readonly langChainService = langChainService;
  private readonly MAX_RETRIES: number = 3;
  private readonly RETRY_DELAY: number = 1000; // 1 second

  constructor() {
    this.apiKey = process.env.SCRAPING_BEE_API_KEY ?? "";
    if (!this.apiKey) {
      throw new Error("SCRAPING_BEE_API_KEY environment variable is required");
    }
    this.client = new ScrapingBeeClient(this.apiKey);
  }

  private cleanHtml(html: string, source: ISource): string {
    console.log("Length before:", html.length);
    const $ = cheerio.load(html);
    let mainContent = $(source.includeSelector);

    // If includeSelector not found, try fallbacks
    if (mainContent.length === 0) {
      console.log("includeSelector not found, trying fallbacks");
      mainContent = $("main");
      if (mainContent.length === 0) {
        console.log("main tag not found, using body");
        mainContent = $("body");
      }
    }

    // Remove excluded elements if excludeSelector is defined
    if (source.excludeSelector) {
      mainContent.find(source.excludeSelector).remove();
    }

    const cleanedHtml = mainContent.html() || html;
    console.log("Length after selector:", cleanedHtml.length);
    const truncated = cleanedHtml.slice(0, this.MAX_TOKENS);
    console.log("Length after truncation:", truncated.length);
    return truncated;
  }

  private cleanJsonString(str: string): string {
    // Remove markdown code block markers if any
    str = str.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    // Find the first occurrence of a JSON array
    const jsonMatch: RegExpMatchArray | null = str.match(/\[\s*\{/);
    if (jsonMatch) {
      str = str.slice(jsonMatch.index);
    }
    // Remove any trailing content after the last closing bracket
    const lastBracket: number = str.lastIndexOf("]");
    if (lastBracket !== -1) {
      str = str.slice(0, lastBracket + 1);
    }
    // Remove any leading/trailing whitespace
    str = str.trim();
    return str;
  }

  private makeUrlAbsolute(url: string, baseUrl: string): string {
    if (!url) return "";
    try {
      return new URL(url, baseUrl).toString();
    } catch (error) {
      console.error("Error making URL absolute:", error);
      return url;
    }
  }

  private async parseStories(html: string, baseUrl: string): Promise<IStory[]> {
    const prompt: string = `Extract headlines from this HTML, which has been extracted from the front page of a news site. For each headline, provide:
1. The full headline text, e.g., "Biden's State of the Union Address: A Look at the President's Speech" (required)
2. The URL link to the full article (required)
3. A summary of the article, e.g., "Biden's State of the Union Address: A Look at the President's Speech" (if provided in the HTML)
4. The section of the paper the article belongs to. Section can be one of the following: ${Object.values(
      Section
    ).join(", ")} (required)
5. The topic of the article, if it's in the news or opinion sections. Topic can be one of the following: ${Object.values(
      NewsTopic
    ).join(", ")} (required)

Format the response as a correctly formatted JSON array of objects with these fields: fullHeadline, articleUrl, summary, section, type.
IMPORTANT: 
- Keep the JSON response under 4000 characters
- No markdown formatting
- No trailing commas
- Each object must be complete with all fields
- If you can't fit all headlines, return fewer but complete ones.
- Return headlines in the order they appear in the HTML, starting with the first one.
- Ensure all JSON is properly escaped and formatted

HTML content:
${html}`;

    let response: string = "";
    try {
      response = await this.langChainService.askAi(prompt);
      console.log(`Got response from AI with length ${response.length}`);
      const cleanedResponse: string = this.cleanJsonString(response);
      console.log(`Got cleaned response with length ${cleanedResponse.length}`);
      console.log("Cleaned response:", cleanedResponse);

      try {
        const stories: IStory[] = JSON.parse(cleanedResponse);
        console.log(
          `Got ${stories.length} stories: `,
          stories.map((h) => h.fullHeadline).join("\n")
        );
        return stories.map((story) => ({
          ...story,
          articleUrl: this.makeUrlAbsolute(story.articleUrl, baseUrl),
        }));
      } catch (parseError: unknown) {
        console.error("JSON Parse Error:", parseError);
        console.error("Failed to parse response:", cleanedResponse);
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parse error";
        throw new Error(`Failed to parse stories JSON: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error parsing stories:", error);
      console.error("Raw response:", response);
      throw error;
    }
  }

  private async retryableRequest(
    url: string,
    params: Record<string, boolean>
  ): Promise<{ data: Buffer }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.client.get({ url, params });
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, lastError.message); // don't need the whole stack trace

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY * attempt)
          );
        }
      }
    }

    throw new Error(
      `Failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`
    );
  }

  private sanitizeXml(xml: string): string {
    return xml.replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, "&amp;");
  }

  private async rssExists(url: string): Promise<boolean> {
    try {
      const response = await this.client.get({
        url,
        params: {
          render_js: false,
          premium_proxy: true,
        },
      });
      return response.data.toString("utf-8").includes("RSS");
    } catch (error) {
      return false;
    }
  }

  private async fetchMetadataForStory(story: IStory): Promise<IStory> {
    try {
      // Only fetch metadata if the URL is valid
      if (story.articleUrl) {
        const metadata = await previewService.getPageMetadata(story.articleUrl);

        const updatedStory = { ...story };

        // Add image URL if found
        if (metadata.imageUrl) {
          updatedStory.imageUrl = metadata.imageUrl;
        }

        // Use description from article page if it's longer than the existing summary
        if (metadata.description) {
          // First capture existing summary length
          const summaryLength = story.summary ? story.summary.length : 0;
          const metadataDescriptionLength = metadata.description.length;

          // If metadata description is longer or summary doesn't exist, use the metadata description
          if (metadataDescriptionLength > summaryLength) {
            updatedStory.description = metadata.description;
          }
        }

        return updatedStory;
      }
    } catch (error) {
      console.error(`Error fetching metadata for ${story.articleUrl}:`, error);
    }

    // Always return the original story if no update was made or if there was an error
    return story;
  }

  public async collectAll(): Promise<void> {
    try {
      // Get all sources
      const sources = await Source.find();
      console.log(`Found ${sources.length} sources to collect from`);

      // Scrape each source one at a time
      for (const source of sources) {
        await this.collectOne(source);
      }
      console.log("Completed collecting from all sources");
    } catch (error) {
      console.error("Error in collectAll:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  public async collectOne(source: ISource): Promise<IStory[]> {
    try {
      console.log(
        `Starting collection for source: ${source.name} (${source.homepageUrl})`
      );
      // do this first to avoid race condition
      await Source.findByIdAndUpdate(source.id, { lastScrapedAt: new Date() });

      let stories: IStory[] = [];
      if (source.rssUrl) {
        console.log(`Using RSS feed for ${source.name}`);
        stories = await this.readRss(source.id);
      } else if (source.includeSelector) {
        console.log(`Scraping webpage for ${source.name}`);
        stories = await this.scrapeHomepage(source.id);
      } else {
        // next see if there is an RSS feed at the default location: /feed
        const rssUrl = source.homepageUrl + "/feed";
        if (await this.rssExists(rssUrl)) {
          console.log(`Found RSS feed at ${rssUrl}`);
          // save the RSS URL to the source
          await Source.findByIdAndUpdate(source.id, { rssUrl });
          stories = await this.readRss(source.id);
        } else {
          // if no RSS feed is found, scrape the homepage
          stories = await this.scrapeHomepage(source.id);
        }
      }

      // Fetch metadata for stories that need it
      const enhancedStories: IStory[] = [];
      for (const story of stories) {
        if (!story.imageUrl || !story.summary) {
          const enhancedStory = await this.fetchMetadataForStory(story);
          enhancedStories.push(enhancedStory);
        } else {
          enhancedStories.push(story);
        }
      }

      // Save stories to database
      await storyService.addStories(source.id, enhancedStories);
      console.log(`Saved ${enhancedStories.length} stories for ${source.name}`);

      return enhancedStories;
    } catch (error) {
      console.error(`Error collecting from source ${source.name}:`, error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      return [];
    }
  }

  public async scrapeHomepage(sourceId: string): Promise<IStory[]> {
    const source = await Source.findById(sourceId);
    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`);
    }
    try {
      const response = await this.retryableRequest(source.homepageUrl, {
        render_js: false,
        premium_proxy: true,
      });

      const html: string = response.data.toString("utf-8");
      const cleanedHtml: string = this.cleanHtml(html, source);
      const stories = await this.parseStories(cleanedHtml, source.homepageUrl);

      return stories;
    } catch (error) {
      console.error("Error scraping page:", error);
      throw error;
    }
  }

  public async readRss(sourceId: string): Promise<IStory[]> {
    const source = await Source.findById(sourceId);
    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`);
    }
    if (!source.rssUrl) {
      throw new Error(`No RSS URL configured for source: ${source.name}`);
    }

    try {
      // Configure the parser to capture media:content tags
      const parser = new Parser({
        customFields: {
          item: [["media:content", "mediaContent", { keepArray: true }]],
        },
      });

      const response = await fetch(source.rssUrl);
      const xmlText = await response.text();
      const sanitizedXml = this.sanitizeXml(xmlText);
      const feed = await parser.parseString(sanitizedXml);

      // Check if feed has an image and update source if different
      if (feed.image?.url && feed.image.url !== source.imageUrl) {
        await Source.findByIdAndUpdate(sourceId, { imageUrl: feed.image.url });
      }

      const stories: IStory[] = feed.items.map((item: any, index: number) => {
        const hasAudioEnclosure: boolean =
          (item.enclosure && item.enclosure.type === "audio/mpeg") ?? false;
        const hasVideoEnclosure: boolean =
          (item.enclosure && item.enclosure.type === "video/mp4") ?? false;
        const summary: string =
          item.contentSnippet ||
          item.content ||
          (typeof item.description === "string" ? item.description : "") ||
          (hasAudioEnclosure ? "Audio recording" : "") ||
          (hasVideoEnclosure ? "Video recording" : "");

        // Extract image URL from media:content if available
        let imageUrl: string | null = null;

        // Try to find an image from mediaContent
        if (item.mediaContent && Array.isArray(item.mediaContent)) {
          // Look for media with an image type or medium
          for (const media of item.mediaContent) {
            if (
              media &&
              media.$ &&
              (media.$.medium === "image" ||
                (media.$.type && media.$.type.startsWith("image/"))) &&
              media.$.url
            ) {
              imageUrl = media.$.url;
              break;
            }
          }

          // If no image type found but we have media with urls, use the first one
          if (
            !imageUrl &&
            item.mediaContent.length > 0 &&
            item.mediaContent[0].$ &&
            item.mediaContent[0].$.url
          ) {
            imageUrl = item.mediaContent[0].$.url;
          }
        }

        // Fall back to enclosure if it's an image
        if (
          !imageUrl &&
          item.enclosure &&
          item.enclosure.type &&
          item.enclosure.type.startsWith("image/") &&
          item.enclosure.url
        ) {
          imageUrl = item.enclosure.url;
        }

        // Get publish date from RSS feed if available
        const publishDate: Date = item.pubDate
          ? new Date(item.pubDate)
          : new Date();
        const isValidDate: boolean = !isNaN(publishDate.getTime());
        const createdAt: Date = isValidDate ? publishDate : new Date();

        return {
          fullHeadline: item.title || "",
          articleUrl: item.link || "",
          summary,
          section: Section.NEWS, // Default to NEWS, can be updated by AI later
          type: NewsTopic.US_POLITICS, // Default to US_POLITICS, can be updated by AI later
          inPageRank: index + 1,
          sourceId: new mongoose.Types.ObjectId(sourceId),
          imageUrl,
          archived: false,
          createdAt,
          updatedAt: new Date(),
        };
      });

      return stories;
    } catch (error) {
      console.error("Error reading RSS feed:", error);
      throw error;
    }
  }
}

export const scraperService = new ScraperService();
