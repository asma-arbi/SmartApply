import * as cheerio from "cheerio";
import { RateLimiter, getBackoffDelay, sleep, type ScraperSourceConfig } from "../scraper-config";
import type { ExternalJobSource } from "@/lib/models/types";

export interface ScrapedJob {
  externalId: string;
  externalUrl: string;
  title: string;
  companyName: string;
  location: string;
  type: string;
  description: string;
  category?: string;
  skills?: string[];
  postedDate?: string;
}

export interface ScrapeResult {
  success: boolean;
  jobsScraped: number;
  jobsSaved: number;
  jobsUpdated: number;
  jobsSkipped: number;
  errors: string[];
}

/**
 * Base scraper class with common functionality
 */
export abstract class BaseScraper {
  protected config: ScraperSourceConfig;
  protected source: ExternalJobSource;
  protected rateLimiter: RateLimiter;

  constructor(config: ScraperSourceConfig, source: ExternalJobSource) {
    this.config = config;
    this.source = source;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  /**
   * Fetch HTML with retries and rate limiting
   */
  protected async fetchHTML(url: string): Promise<string | null> {
    await this.rateLimiter.waitForSlot();

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          headers: {
            "User-Agent": this.config.userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited - wait and retry
          const delay = getBackoffDelay(attempt);
          console.warn(`[${this.source}] Rate limited, waiting ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        if (response.status === 404) {
          console.warn(`[${this.source}] Page not found: ${url}`);
          return null;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        if (attempt === this.config.retries) {
          console.error(`[${this.source}] Failed to fetch ${url} after ${attempt + 1} attempts:`, error);
          return null;
        }

        const delay = getBackoffDelay(attempt);
        console.warn(`[${this.source}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    return null;
  }

  /**
   * Load Cheerio instance from HTML
   */
  protected loadHTML(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /**
   * Normalize text (trim, remove extra whitespace)
   */
  protected normalizeText(text: string | undefined | null): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   * Extract text from element
   */
  protected extractText($: cheerio.CheerioAPI, selector: string, parent?: cheerio.Cheerio<any>): string {
    const element = parent ? parent.find(selector) : $(selector);
    return this.normalizeText(element.text());
  }

  /**
   * Parse relative date (e.g., "il y a 2 jours")
   */
  protected parseRelativeDate(dateText: string): string | undefined {
    const now = new Date();
    
    // Match patterns like "il y a 2 jours", "2 days ago", "yesterday"
    const patterns = [
      { regex: /(\d+)\s*jour[s]?/i, unit: "days" },
      { regex: /(\d+)\s*heure[s]?/i, unit: "hours" },
      { regex: /(\d+)\s*semaine[s]?/i, unit: "weeks" },
      { regex: /(\d+)\s*mois/i, unit: "months" },
      { regex: /hier/i, value: 1, unit: "days" },
      { regex: /yesterday/i, value: 1, unit: "days" },
      { regex: /today|aujourd'hui/i, value: 0, unit: "days" },
    ];

    for (const pattern of patterns) {
      const match = dateText.match(pattern.regex);
      if (match) {
        const value = pattern.value !== undefined ? pattern.value : parseInt(match[1], 10);
        
        switch (pattern.unit) {
          case "hours":
            now.setHours(now.getHours() - value);
            break;
          case "days":
            now.setDate(now.getDate() - value);
            break;
          case "weeks":
            now.setDate(now.getDate() - value * 7);
            break;
          case "months":
            now.setMonth(now.getMonth() - value);
            break;
        }
        
        return now.toISOString();
      }
    }

    return undefined;
  }

  /**
   * Validate required fields
   */
  protected validateJob(job: Partial<ScrapedJob>): job is ScrapedJob {
    return !!(
      job.externalId &&
      job.externalUrl &&
      job.title &&
      job.companyName &&
      job.location &&
      job.type &&
      job.description
    );
  }

  /**
   * Abstract method to be implemented by each scraper
   */
  abstract scrape(maxPages?: number): Promise<ScrapeResult>;

  /**
   * Get source name
   */
  getSourceName(): string {
    return this.config.name;
  }
}
