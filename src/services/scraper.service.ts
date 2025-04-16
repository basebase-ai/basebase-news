import { ScrapingBeeClient } from "scrapingbee";
import * as cheerio from "cheerio";
import { ISource, Source } from "../models/source.model";
import { IHeadline, NewsTopic, Section } from "../models/headline.model";
import { langChainService } from "./langchain.service";
import { headlineService } from "./headline.service";

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
    const mainContent = $(source.cssSelector).html() || html;
    console.log("Length after selector:", mainContent.length);
    const truncated = mainContent.slice(0, this.MAX_TOKENS);
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

  private async parseHeadlines(
    htmlString: string,
    baseUrl: string
  ): Promise<IHeadline[]> {
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
${htmlString}`;

    let response: string = "";
    try {
      response = await this.langChainService.askAi(prompt);
      console.log(`Got response from AI with length ${response.length}`);
      const cleanedResponse: string = this.cleanJsonString(response);
      console.log(`Got cleaned response with length ${cleanedResponse.length}`);
      console.log("Cleaned response:", cleanedResponse);

      try {
        const headlines: IHeadline[] = JSON.parse(cleanedResponse);
        console.log(`Got ${headlines.length} headlines`);
        return headlines.map((headline) => ({
          ...headline,
          articleUrl: this.makeUrlAbsolute(headline.articleUrl, baseUrl),
        }));
      } catch (parseError: unknown) {
        console.error("JSON Parse Error:", parseError);
        console.error("Failed to parse response:", cleanedResponse);
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parse error";
        throw new Error(`Failed to parse headlines JSON: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error parsing headlines:", error);
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
        console.error(`Attempt ${attempt} failed:`, error);

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

  public async scrapeAll(): Promise<void> {
    try {
      // Get all sources
      const sources = await Source.find();
      console.log(`Found ${sources.length} sources to scrape`);

      // Scrape each source one at a time
      for (const source of sources) {
        try {
          console.log(
            `Starting scrape of source: ${source.name} (${source.homepageUrl})`
          );
          const headlines = await this.scrapeSource(source.id);
          console.log(
            `Successfully scraped ${headlines.length} headlines from ${source.name}`
          );
        } catch (error) {
          console.error(`Error scraping source ${source.name}:`, error);
          if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
          }
          // Continue with next source even if one fails
        }
      }
      console.log("Completed scraping all sources");
    } catch (error) {
      console.error("Error in scrapeAll:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  public async scrapeSource(sourceId: string): Promise<IHeadline[]> {
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
      const headlines = await this.parseHeadlines(
        cleanedHtml,
        source.homepageUrl
      );

      // Save headlines to database
      await headlineService.addHeadlines(sourceId, headlines);
      console.log(`Saved ${headlines.length} headlines for ${source.name}`);

      return headlines;
    } catch (error) {
      console.error("Error scraping page:", error);
      throw error;
    }
  }
}

export const scraperService = new ScraperService();
