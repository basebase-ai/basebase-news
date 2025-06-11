// import { ScrapingBeeClient } from "scrapingbee";
import * as cheerio from "cheerio";
import axios, { AxiosResponse } from "axios";
import { ISource, Source } from "../models/source.model";
import { IStory, NewsTopic, Section } from "../models/story.model";
import { langChainService } from "./langchain.service";
import { storyService } from "./story.service";
import { previewService } from "./preview.service";
import Parser from "rss-parser";
import mongoose from "mongoose";
import { Story } from "../models/story.model";

export class ScraperService {
  // private readonly client: ScrapingBeeClient;
  // private readonly apiKey: string;
  private readonly MAX_TOKENS: number = 100000;
  private readonly langChainService = langChainService;
  private readonly MAX_RETRIES: number = 3;
  private readonly RETRY_DELAY: number = 1000; // 1 second

  // constructor() {
  //   this.apiKey = process.env.SCRAPING_BEE_API_KEY ?? "";
  //   if (!this.apiKey) {
  //     throw new Error("SCRAPING_BEE_API_KEY environment variable is required");
  //   }
  //   this.client = new ScrapingBeeClient(this.apiKey);
  // }

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
      response = await this.langChainService.askAi(prompt);
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

      // make the articleUrl absolute
      stories.forEach((story: any) => {
        story.articleUrl = this.makeUrlAbsolute(story.articleUrl, baseUrl);
        story.fullHeadline = this.decodeHtmlEntities(story.fullHeadline);
      });
      return stories;
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

  private decodeHtmlEntities(text: string): string {
    if (!text) return "";

    // First pass: handle numeric and hex entities
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
    text = text.replace(/&#x([0-9a-f]+);/i, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // Second pass: handle named entities
    return text.replace(/&[#\w]+;/g, (match: string): string => {
      switch (match) {
        case "&amp;":
          return "&";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        case "&#8216;":
          return "'";
        case "&#8217;":
          return "'";
        case "&#8218;":
          return "'";
        case "&#8220;":
          return '"';
        case "&#8221;":
          return '"';
        case "&#8222;":
          return '"';
        case "&#038;":
          return "&";
        case "&#039;":
          return "'";
        case "&#39;":
          return "'";
        case "&#34;":
          return '"';
        case "&#60;":
          return "<";
        case "&#62;":
          return ">";
        case "&#160;":
          return " ";
        case "&nbsp;":
          return " ";
        case "&ndash;":
          return "–";
        case "&mdash;":
          return "—";
        case "&hellip;":
          return "…";
        case "&trade;":
          return "™";
        case "&copy;":
          return "©";
        case "&reg;":
          return "®";
        default:
          // Try to decode any remaining numeric entities
          const numericMatch = match.match(/&#(\d+);/);
          if (numericMatch) {
            return String.fromCharCode(parseInt(numericMatch[1], 10));
          }
          return match;
      }
    });
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
      // Only fetch metadata if the URL is valid
      if (story.articleUrl) {
        const metadata = await previewService.getPageMetadata(story.articleUrl);

        // Set lastScrapedAt to current time
        story.lastScrapedAt = new Date();

        // Add image URL if found
        if (metadata.imageUrl) {
          story.imageUrl = metadata.imageUrl;
        }

        // Use description from article page if it's longer than the existing summary
        if (metadata.description) {
          // First capture existing summary length
          const summaryLength = story.summary ? story.summary.length : 0;
          const metadataDescriptionLength = metadata.description.length;

          // If metadata description is longer or summary doesn't exist, use the metadata description
          if (metadataDescriptionLength > summaryLength) {
            story.summary = metadata.description;
          }
        }

        // Try to fetch the full article text
        try {
          // Fetch full HTML content
          const response = await this.retryableRequest(story.articleUrl);
          // use cheerio to extract the text content
          const $ = cheerio.load(response.data);
          const textContent = $("body").text();
          // Ask AI to extract the full text of the article and metadata as JSON
          const prompt = `
Extract the following information from this news article as a valid JSON object:
1. fullText: The complete article text content, excluding navigation, ads, related articles, comments, and other non-article content
2. authorNames: An array of names of the article's author(s)

If you can't find any clear article text or the article appears to be behind a paywall, set fullText to "PAYWALL_DETECTED" and provide any author information if available.

Return only a valid JSON object with these fields, properly escaped, with no additional text, markdown, or explanation.

HTML content:
${textContent.substring(0, this.MAX_TOKENS)}
`;

          const aiResponse = await this.langChainService.askAi(prompt);

          try {
            // Parse the JSON response
            const articleData = this.cleanJsonResponse(aiResponse);

            // Handle null response from cleanJsonResponse
            if (articleData) {
              // Check if full text was successfully extracted
              if (
                articleData.fullText &&
                articleData.fullText !== "PAYWALL_DETECTED" &&
                articleData.fullText.length > 100
              ) {
                story.fullText = articleData.fullText;
                console.log(
                  `Extracted full text for ${story.articleUrl}:\n${articleData.fullText}`
                );
              }

              // Add author names if available
              if (
                articleData.authorNames &&
                Array.isArray(articleData.authorNames)
              ) {
                story.authorNames = articleData.authorNames;
              } else if (
                articleData.authorName &&
                typeof articleData.authorName === "string"
              ) {
                // Handle case where LLM returns a single authorName instead of array
                story.authorNames = [articleData.authorName];
              }
            } else {
              console.log(
                `Failed to extract structured data for ${story.articleUrl}`
              );
            }
          } catch (jsonError) {
            console.error(`Error parsing JSON response: ${jsonError}`);
          }
        } catch (extractError) {
          console.error(
            `Error extracting article data for ${story.articleUrl}:`,
            extractError
          );
        }

        return story;
      }
    } catch (error) {
      console.error(`Error fetching metadata for ${story.articleUrl}:`, error);
    }

    // Always return the original story if no update was made or if there was an error
    return story;
  }

  public async scrapeAllSources(): Promise<void> {
    try {
      // Get all sources
      const sources = await Source.find();
      console.log(`Found ${sources.length} sources to collect from`);

      // Scrape each source one at a time
      for (const source of sources) {
        await this.scrapeSource(source);
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

  public async scrapeSource(source: ISource): Promise<IStory[]> {
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
          console.log(`No RSS feed found at ${rssUrl}`);
          // if no RSS feed is found, scrape the homepage
          // commented out because it's expensive and no one is using it ATM
          // stories = await this.scrapeHomepage(source.id);
        }
      }

      // Reset inPageRank for existing stories in this source
      await Story.updateMany(
        {
          sourceId: new mongoose.Types.ObjectId(source.id),
          inPageRank: { $ne: null },
        },
        { inPageRank: null }
      );

      // Process and save each story individually
      const savedStories: IStory[] = [];
      for (let index = 0; index < stories.length; index++) {
        const story: IStory = stories[index];
        try {
          // Check if the story already exists in the database
          const existingStory = await Story.findOne({
            articleUrl: story.articleUrl,
          });

          let enhancedStory = story;

          // Only scrape details if:
          // 1. No paywall exists for this source
          // 2. AND either:
          //    a. This is a new story, OR
          //    b. It's an existing story but for some reasonwe haven't scraped its details yet
          // if (
          //   !source.hasPaywall &&
          //   (!existingStory || !existingStory.lastScrapedAt)
          // ) {
          //   console.log(`Scraping story: ${story.articleUrl}`);
          //   enhancedStory = await this.scrapeStoryDetailsPage(story);
          // } else {
          //   console.log(`Story already exists: ${story.articleUrl}`);
          // }

          // Save the story immediately to the database
          const savedStory = await storyService.addStory(
            source.id,
            enhancedStory,
            index + 1
          );
          savedStories.push(savedStory);
          console.log(`Saved story: ${savedStory.fullHeadline}`);
        } catch (storyError) {
          console.error(
            `Error processing story ${story.articleUrl}:`,
            storyError
          );
          // Continue with the next story even if one fails
        }
      }

      console.log(`Saved ${savedStories.length} stories for ${source.name}`);
      return savedStories;
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
      const response = await this.retryableRequest(source.homepageUrl);

      const html: string = response.data;
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
          item: [
            // field names are all lowercase because we normalize tags
            ["media:content", "mediaContent", { keepArray: true }],
            ["pubdate", "pubDate"],
            ["isodate", "isoDate"],
          ],
        },
        xml2js: {
          normalize: true,
          normalizeTags: true,
          decodeEntities: true,
        },
      });

      const rssResponse: AxiosResponse<string> = await axios.get(
        source.rssUrl,
        {
          timeout: 30000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        }
      );
      const xmlText: string = rssResponse.data;
      console.log("[RSS Debug] Raw XML snippet:", xmlText.substring(0, 500));
      const feed = await parser.parseString(xmlText);
      console.log("[RSS Debug] First feed item:", feed.items[0]);

      // Check if feed has an image and update source if different
      if (feed.image?.url && feed.image.url !== source.imageUrl) {
        await Source.findByIdAndUpdate(sourceId, { imageUrl: feed.image.url });
      }

      const stories: IStory[] = feed.items.map((item: any, index: number) => {
        // START MAPPING
        console.log(`[RSS Debug] item:`, item);
        const hasAudioEnclosure: boolean =
          (item.enclosure && item.enclosure.type === "audio/mpeg") ?? false;
        const hasVideoEnclosure: boolean =
          (item.enclosure && item.enclosure.type === "video/mp4") ?? false;

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

        console.log(`[RSS Debug] Raw pubDate from RSS:`, item.rawPubDate);

        // Get full content if available

        return {
          fullHeadline: this.decodeHtmlEntities(item.title || ""),
          articleUrl: item.link || "",
          summary: this.decodeHtmlEntities(
            item.contentSnippet ||
              item.content ||
              (typeof item.description === "string" ? item.description : "") ||
              (hasAudioEnclosure ? "Audio recording" : "") ||
              (hasVideoEnclosure ? "Video recording" : "")
          ),
          fullText: this.decodeHtmlEntities(item.content || ""),
          section: Section.NEWS, // Default to NEWS, can be updated by AI later
          type: NewsTopic.US_POLITICS, // Default to US_POLITICS, can be updated by AI later
          inPageRank: index + 1,
          sourceId: new mongoose.Types.ObjectId(sourceId),
          imageUrl,
          createdAt: item.pubDate
            ? new Date(item.pubDate)
            : item.isoDate
              ? new Date(item.isoDate)
              : new Date(),
        } as IStory;
        // END MAPPING
      });

      return stories;
    } catch (error) {
      console.error("Error reading RSS feed:", error);
      throw error;
    }
  }
}

export const scraperService = new ScraperService();
