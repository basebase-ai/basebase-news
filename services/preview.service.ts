import * as cheerio from "cheerio";
import axios from "axios";

export interface IPageMetadata {
  imageUrl: string | null;
  description: string | null;
}

export class PreviewService {
  private readonly MAX_RETRIES: number = 3;
  private readonly RETRY_DELAY: number = 1000; // 1 second

  /**
   * Extracts metadata from a webpage
   * @param url The URL to extract image and description from
   * @returns The image URL and description, or null if not found
   */
  public async getPageMetadata(url: string): Promise<IPageMetadata> {
    try {
      const html: string = await this.fetchUrl(url);
      return this.extractMetadata(html, url);
    } catch (error) {
      console.error(`Error getting metadata for ${url}:`, error);
      return {
        imageUrl: null,
        description: null,
      };
    }
  }

  /**
   * Fetches the HTML content from a URL with retry logic using ScrapingBee
   * @param url The URL to fetch
   * @returns HTML content as string
   */
  private async fetchUrl(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.retryableRequest(url, {});

        return response.data.toString("utf-8");
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY * attempt)
          );
        }
      }
    }

    throw new Error(
      `Failed to fetch URL after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Makes a retryable request using axios
   * @param url URL to fetch
   * @param params Request parameters (unused but kept for compatibility)
   * @returns Response data
   */
  private async retryableRequest(
    url: string,
    params: Record<string, any>
  ): Promise<{ data: Buffer }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });
        return { data: Buffer.from(response.data, "utf-8") };
      } catch (error) {
        lastError = error as Error;
        console.error(`Request attempt ${attempt} failed:`, lastError.message);

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

  /**
   * Extracts the image URL and description from HTML content
   * @param html HTML content
   * @param url Original URL for resolving relative paths
   * @returns Image URL and description, or null if not found
   */
  private extractMetadata(html: string, url: string): IPageMetadata {
    const $ = cheerio.load(html);

    // Initialize metadata object
    const metadata: IPageMetadata = {
      imageUrl: null,
      description: null,
    };

    // Extract image (prioritize Open Graph, then Twitter)
    const ogImage = $('meta[property="og:image"]').attr("content");
    const twitterImage = $('meta[name="twitter:image"]').attr("content");

    if (ogImage) {
      metadata.imageUrl = this.makeUrlAbsolute(ogImage, url);
    } else if (twitterImage) {
      metadata.imageUrl = this.makeUrlAbsolute(twitterImage, url);
    }

    // Extract description (prioritize Open Graph, then Twitter, then meta description)
    metadata.description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      null;

    return metadata;
  }

  /**
   * Converts a relative URL to an absolute URL
   * @param url URL to convert
   * @param baseUrl Base URL for resolving
   * @returns Absolute URL
   */
  private makeUrlAbsolute(url: string, baseUrl: string): string {
    if (!url) return "";
    try {
      return new URL(url, baseUrl).toString();
    } catch (error) {
      console.error("Error making URL absolute:", error);
      return url;
    }
  }
}

export const previewService = new PreviewService();
