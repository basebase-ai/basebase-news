import { ScrapingBeeClient } from "scrapingbee";
import * as cheerio from "cheerio";
import { INewsSource, NEWS_SOURCES } from "../models/newssource.model";
import { IHeadline, NewsTopic, Section } from "../models/headline.model";
import { LangChainService } from "./langchain.service";

export class ScraperService {
  private readonly client: ScrapingBeeClient;
  private readonly apiKey: string;
  private readonly MAX_TOKENS: number = 100000;
  private readonly langChainService: LangChainService;

  constructor() {
    this.apiKey = process.env.SCRAPING_BEE_API_KEY ?? "";
    if (!this.apiKey) {
      throw new Error("SCRAPING_BEE_API_KEY environment variable is required");
    }
    this.client = new ScrapingBeeClient(this.apiKey);
    this.langChainService = new LangChainService();
  }

  private extractHeadlineContent(html: string): string {
    const $ = cheerio.load(html);
    const headlineElements: string[] = [];

    // Common headline selectors
    $(
      'h1, h2, h3, .headline, .article-title, .story-title, [class*="headline"], [class*="title"]'
    ).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        headlineElements.push(text);
      }
    });

    return headlineElements.join("\n");
  }

  private cleanHtml(html: string, sourceName: string): string {
    console.log("Length before:", html.length);
    const $ = cheerio.load(html);
    const config = NEWS_SOURCES[sourceName];
    const mainContent = config ? $(config.cssSelector).html() || html : html;
    console.log("Length after selector:", mainContent.length);
    const truncated = mainContent.slice(0, this.MAX_TOKENS);
    console.log("Length after truncation:", truncated.length);
    return truncated;
  }

  private cleanJsonString(str: string): string {
    // Remove markdown code block markers if any
    str = str.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    // Remove any leading/trailing whitespace
    str = str.trim();
    return str;
  }

  private async parseHeadlines(htmlString: string): Promise<IHeadline[]> {
    const prompt: string = `Extract headlines from this HTML, which has been extracted from the front page of a news site. For each headline, provide:
1. The full headline text, e.g., "Biden's State of the Union Address: A Look at the President's Speech" (required)
2. The URL link to the full article (required)
3. The section of the paper the article belongs to. Section can be one of the following: ${Object.values(
      Section
    ).join(", ")} (required)
4. The topic of the article, if it's in the news or opinion sections. Topic can be one of the following: ${Object.values(
      NewsTopic
    ).join(", ")} (required)

Format the response as a correctly formatted JSON array of objects with these fields: fullHeadline, articleUrl, section, type.
IMPORTANT: 
- Keep the JSON response under 4000 characters
- No markdown formatting
- No trailing commas
- Each object must be complete with all fields
- If you can't fit all headlines, return fewer but complete ones.
- Return headlines in the order they appear in the HTML, starting with the first one.

HTML content:
${htmlString}`;

    let response: string = "";
    try {
      response = await this.langChainService.askAi(prompt);
      console.log(`Got response from AI with length ${response.length}`);
      const cleanedResponse: string = this.cleanJsonString(response);
      console.log(`Got cleaned response with length ${cleanedResponse.length}`);
      const headlines: IHeadline[] = JSON.parse(cleanedResponse);
      console.log(`Got ${headlines.length} headlines`);
      return headlines;
    } catch (error) {
      console.error("Error parsing headlines:", error);
      console.error("Raw response:", response);
      throw error;
    }
  }

  public async scrapePage(sourceName: string): Promise<IHeadline[]> {
    const config = NEWS_SOURCES[sourceName];
    if (!config) {
      throw new Error(`Unknown news source: ${sourceName}`);
    }
    try {
      const response = await this.client.get({
        url: config.homepageUrl,
        params: {
          render_js: false,
          premium_proxy: true,
        },
      });

      const html: string = response.data.toString("utf-8");
      const cleanedHtml: string = this.cleanHtml(html, sourceName);
      return await this.parseHeadlines(cleanedHtml);
    } catch (error) {
      console.error("Error scraping page:", error);
      throw error;
    }
  }
}
