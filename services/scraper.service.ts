// import { ScrapingBeeClient } from "scrapingbee";
import * as cheerio from "cheerio";
import axios, { AxiosResponse } from "axios";
import { ISource, sourceServerService } from "./source.server.service";
import { storyServerService, IStory } from "./story.server.service";
import { previewService } from "./preview.service";
import Parser from "rss-parser";
import * as he from "he";

// Define enums that were previously imported from models
enum Section {
  NEWS = "NEWS",
  OPINION = "OPINION",
  SPORTS = "SPORTS",
  BUSINESS = "BUSINESS",
  TECHNOLOGY = "TECHNOLOGY",
  ENTERTAINMENT = "ENTERTAINMENT",
  LIFESTYLE = "LIFESTYLE",
}

enum NewsTopic {
  US_POLITICS = "US_POLITICS",
  WORLD = "WORLD",
  ECONOMY = "ECONOMY",
  TECHNOLOGY = "TECHNOLOGY",
  HEALTH = "HEALTH",
  SCIENCE = "SCIENCE",
  SPORTS = "SPORTS",
  ENTERTAINMENT = "ENTERTAINMENT",
}

export class ScraperService {
  // private readonly client: ScrapingBeeClient;
  // private readonly apiKey: string;
  private readonly MAX_TOKENS: number = 100000;
  private readonly MAX_RETRIES: number = 3;
  private readonly RETRY_DELAY: number = 1000; // 1 second

  private cleanJsonResponse(response: string): any {
    // Remove markdown code block markers if any
    let str = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Remove any leading/trailing whitespace
    str = str.trim();

    // Clean common JSON issues
    // Replace multiple consecutive newlines with a single newline
    str = str.replace(/\n+/g, "\n");
    // Fix trailing commas in objects and arrays
    str = str.replace(/,(\s*[\]}])/g, "$1");

    // Remove or replace control characters (common source of JSON parsing errors)
    str = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    // Try to parse the JSON
    try {
      return JSON.parse(str);
    } catch (initialParseError) {
      console.error("JSON parse failed", initialParseError, str);
    }
    return null;
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
      response = ""; // await this.langChainService.askAi(prompt);
      console.log(`Got response from AI with length ${response.length}`);

      const stories = this.cleanJsonResponse(response);

      // Handle null response from cleanJsonResponse
      if (!stories) {
        console.error("Failed to parse stories from AI response");
        return [];
      }

      console.log(
        `Got ${stories.length} stories: `,
        stories.map((h: any) => h.fullHeadline).join("\n")
      );

      // make the articleUrl absolute and convert to IStory format
      return stories.map((story: any) => ({
        headline: he.decode(story.fullHeadline),
        url: this.makeUrlAbsolute(story.articleUrl, baseUrl),
        summary: story.summary,
        publishedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Error parsing stories:", error);
      console.error("Raw response:", response);
      return []; // Return empty array instead of throwing
    }
  }

  private async retryableRequest(url: string): Promise<{ data: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response: AxiosResponse<string> = await axios.get(url, {
          timeout: 30000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });
        return { data: response.data };
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

  private async rssExists(url: string): Promise<boolean> {
    try {
      const response: AxiosResponse<string> = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
      return response.data.includes("xml");
    } catch (error) {
      return false;
    }
  }

  private async scrapeStoryDetailsPage(story: IStory): Promise<IStory> {
    try {
      // Only fetch page metadata if the URL is valid
      if (story.url) {
        const pageMetadata = await previewService.getPageMetadata(story.url);

        // Set lastScrapedAt to current time

        // Add image URL if found
        if (pageMetadata.imageUrl) {
          story.imageUrl = pageMetadata.imageUrl;
        }

        // Use description from article page if it's longer than the existing summary
        if (pageMetadata.description) {
          const summaryLength = story.summary ? story.summary.length : 0;
          const metadataDescriptionLength = pageMetadata.description.length;

          if (metadataDescriptionLength > summaryLength) {
            story.summary = he.decode(pageMetadata.description);
          }
        }
      }

      return story;
    } catch (error) {
      console.error(`Error fetching page metadata for ${story.url}:`, error);
      return story;
    }
  }

  public async scrapeSource(sourceId: string): Promise<void> {
    // Get source from BaseBase
    const source = await sourceServerService.getSource(sourceId);

    if (!source || !source.rssUrl) {
      throw new Error(
        `No RSS URL configured for source: ${source?.name || sourceId}`
      );
    }

    try {
      const stories = await this.readRss(sourceId);

      // Process each story
      for (const story of stories) {
        await storyServerService.addStory(sourceId, story);
      }

      // Update the lastScrapedAt timestamp
      await sourceServerService.updateSource(sourceId, {
        lastScrapedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error scraping source:", error);
      throw error;
    }
  }

  public async scrapeHomepage(sourceId: string): Promise<IStory[]> {
    // Get source from BaseBase
    const source = await sourceServerService.getSource(sourceId);

    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`);
    }

    try {
      const response = await this.retryableRequest(source.homepageUrl || "");
      const html: string = response.data;
      const cleanedHtml: string = this.cleanHtml(html, source);
      const stories = await this.parseStories(
        cleanedHtml,
        source.homepageUrl || ""
      );

      return stories;
    } catch (error) {
      console.error("Error scraping page:", error);
      throw error;
    }
  }

  public async readRss(sourceId: string): Promise<IStory[]> {
    // Get source from BaseBase
    const source = await sourceServerService.getSource(sourceId);

    if (!source || !source.rssUrl) {
      throw new Error(
        `No RSS URL configured for source: ${source?.name || sourceId}`
      );
    }

    try {
      const parser = new Parser({
        customFields: {
          item: [
            ["media:content", "mediaContent", { keepArray: true }],
            ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
          ],
        },
        xml2js: {
          normalize: true,
          normalizeTags: true,
          decodeEntities: true,
        },
      });

      const rssResponse = await axios.get(source.rssUrl, {
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const feed = await parser.parseString(rssResponse.data);

      return feed.items.reduce((acc: IStory[], item: any, index: number) => {
        try {
          const hasAudioEnclosure = item.enclosure?.type === "audio/mpeg";
          const hasVideoEnclosure = item.enclosure?.type === "video/mp4";

          // Extract image URL from media:content if available
          let imageUrl: string | undefined = undefined;

          if (item.mediaContent && Array.isArray(item.mediaContent)) {
            for (const media of item.mediaContent) {
              if (
                media?.$ &&
                (media.$.medium === "image" ||
                  media.$.type?.startsWith("image/")) &&
                media.$.url
              ) {
                imageUrl = media.$.url;
                break;
              }
            }
            if (!imageUrl && item.mediaContent[0]?.$?.url) {
              imageUrl = item.mediaContent[0].$.url;
            }
          }

          if (
            !imageUrl &&
            item.mediaThumbnail &&
            Array.isArray(item.mediaThumbnail)
          ) {
            for (const thumbnail of item.mediaThumbnail) {
              if (thumbnail?.$ && thumbnail.$.url) {
                imageUrl = thumbnail.$.url;
                break;
              }
            }
          }

          if (
            !imageUrl &&
            item.enclosure?.type?.startsWith("image/") &&
            item.enclosure.url
          ) {
            imageUrl = item.enclosure.url;
          }

          const newStory = {
            headline: he.decode(item.title || ""),
            url: item.link || "",
            summary: he.decode(
              item.contentSnippet ||
                item.content ||
                (typeof item.description === "string"
                  ? item.description
                  : "") ||
                (hasAudioEnclosure ? "Audio recording" : "") ||
                (hasVideoEnclosure ? "Video recording" : "")
            ),
            imageUrl: imageUrl || "",
            newsSource: sourceId,
            publishedAt: (item.isoDate
              ? new Date(item.isoDate)
              : item.pubDate
                ? new Date(item.pubDate)
                : new Date()
            ).toISOString(),
            section: Section.NEWS,
            type: NewsTopic.US_POLITICS,
            fullText: he.decode(item.content || ""),
            inPageRank: index + 1,
            createdAt: (item.isoDate
              ? new Date(item.isoDate)
              : item.pubDate
                ? new Date(item.pubDate)
                : new Date()
            ).toISOString(),
            updatedAt: new Date().toISOString(),
            creator: { id: "system", name: "system" },
          } as IStory;

          acc.push(newStory);
        } catch (error) {
          console.error(
            `[Scraper] Failed to parse an article from source ${source.name} (${sourceId}). Error:`,
            error
          );
          console.error("[Scraper] Offending item:", item);
        }
        return acc;
      }, []);
    } catch (error) {
      console.error("Error reading RSS feed:", error);
      throw error;
    }
  }

  /**
   * Scrapes a single source with full validation and timestamp updates
   * @param sourceId - The ID of the source to scrape
   * @returns Object with scraping results and metadata
   */
  public async scrapeSingleSourceWithValidation(sourceId: string): Promise<{
    sourceId: string;
    sourceName: string;
    lastScrapedAt: string;
  }> {
    if (!sourceId) {
      throw new Error("sourceId is required");
    }

    console.log(`[Scraper Service] Starting scrape for source: ${sourceId}`);

    // Get the source to validate it exists
    const source = await sourceServerService.getSource(sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    // Scrape the source (this will also update the lastScrapedAt timestamp)
    await this.scrapeSource(sourceId);

    const lastScrapedAt = new Date().toISOString();

    console.log(
      `[Scraper Service] Successfully scraped source: ${source.name}`
    );

    return {
      sourceId,
      sourceName: source.name,
      lastScrapedAt,
    };
  }

  /**
   * Performs a scheduled rescrape job on stale sources
   * @returns Object with detailed results of the rescrape operation
   */
  public async performScheduledRescrape(): Promise<{
    totalSources: number;
    sourcesNeedingScraping: number;
    sourcesScraped: number;
    successCount: number;
    errorCount: number;
    results: Array<{
      sourceId: string;
      sourceName: string;
      status: "success" | "error";
      error?: string;
    }>;
  }> {
    console.log("[Scraper Service] Starting scheduled rescrape job");

    // Get all sources
    const allSources = await sourceServerService.getSources();
    console.log(`[Scraper Service] Found ${allSources.length} total sources`);

    // Filter sources that need scraping (haven't been scraped in the past 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const sourcesToScrape = allSources
      .filter((source: ISource) => {
        if (!source.lastScrapedAt) {
          return true; // Never scraped before
        }
        const lastScraped = new Date(source.lastScrapedAt);
        return lastScraped < thirtyMinutesAgo;
      })
      .sort((a: ISource, b: ISource) => {
        // Sources that have never been scraped get highest priority
        if (!a.lastScrapedAt && !b.lastScrapedAt) return 0;
        if (!a.lastScrapedAt) return -1;
        if (!b.lastScrapedAt) return 1;

        // Sort by lastScrapedAt ascending (oldest first)
        return (
          new Date(a.lastScrapedAt).getTime() -
          new Date(b.lastScrapedAt).getTime()
        );
      });

    console.log(
      `[Scraper Service] Found ${sourcesToScrape.length} sources that need scraping`
    );

    // Take only the first 5 sources (which are now the most stale)
    const sourcesToScrapeNow = sourcesToScrape.slice(0, 5);

    if (sourcesToScrapeNow.length === 0) {
      console.log("[Scraper Service] No sources need scraping at this time");
      return {
        totalSources: allSources.length,
        sourcesNeedingScraping: 0,
        sourcesScraped: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
      };
    }

    console.log(
      `[Scraper Service] Scraping ${sourcesToScrapeNow.length} sources:`,
      sourcesToScrapeNow.map((s: ISource) => s.name).join(", ")
    );

    const results: Array<{
      sourceId: string;
      sourceName: string;
      status: "success" | "error";
      error?: string;
    }> = [];

    // Scrape each source
    for (const source of sourcesToScrapeNow) {
      try {
        console.log(
          `[Scraper Service] Scraping source: ${source.name} (${source.id})`
        );

        // Scrape the source (this will also update the lastScrapedAt timestamp)
        await this.scrapeSource(source.id);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "success",
        });

        console.log(`[Scraper Service] Successfully scraped ${source.name}`);
      } catch (error) {
        console.error(
          `[Scraper Service] Error scraping source ${source.name}:`,
          error
        );
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    console.log(
      `[Scraper Service] Completed: ${successCount} successful, ${errorCount} errors`
    );

    return {
      totalSources: allSources.length,
      sourcesNeedingScraping: sourcesToScrape.length,
      sourcesScraped: sourcesToScrapeNow.length,
      successCount,
      errorCount,
      results,
    };
  }
}

export const scraperService = new ScraperService();
