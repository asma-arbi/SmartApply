import { BaseScraper, type ScrapedJob, type ScrapeResult } from "./base-scraper";
import { SCRAPER_CONFIG } from "../scraper-config";
import { saveExternalJob } from "../external-scraper";

/**
 * Keejob.com scraper for Tunisia job opportunities
 * 
 * Note: This implementation is based on common HTML structure patterns.
 * The actual selectors may need adjustment based on Keejob's current layout.
 */
export class KeejobScraper extends BaseScraper {
  constructor() {
    super(SCRAPER_CONFIG.sources.keejob, "keejob");
  }

  /**
   * Scrape jobs from Keejob
   */
  async scrape(maxPages: number = 3): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      jobsScraped: 0,
      jobsSaved: 0,
      jobsUpdated: 0,
      jobsSkipped: 0,
      errors: [],
    };

    try {
      console.log(`[Keejob] Starting scrape (max ${maxPages} pages)...`);

      // Scrape multiple pages
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1
          ? `${this.config.baseUrl}/offres-emploi`
          : `${this.config.baseUrl}/offres-emploi?page=${page}`;

        console.log(`[Keejob] Fetching page ${page}...`);
        const html = await this.fetchHTML(pageUrl);

        if (!html) {
          result.errors.push(`Failed to fetch page ${page}`);
          continue;
        }

        const jobs = await this.parseJobListings(html);
        console.log(`[Keejob] Found ${jobs.length} jobs on page ${page}`);

        for (const job of jobs) {
          result.jobsScraped++;

          // Save to database
          const saveResult = await saveExternalJob({
            source: "keejob",
            externalId: job.externalId,
            externalUrl: job.externalUrl,
            title: job.title,
            companyName: job.companyName,
            location: job.location,
            type: job.type,
            description: job.description,
            category: job.category,
            skills: job.skills,
            postedDate: job.postedDate,
          });

          if (saveResult.saved) {
            result.jobsSaved++;
          } else if (saveResult.reason === "duplicate") {
            result.jobsSkipped++;
          } else {
            result.errors.push(`Failed to save job: ${job.title}`);
          }
        }

        // Be respectful - don't hammer the server
        if (page < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      result.success = result.errors.length === 0;
      console.log(
        `[Keejob] Scrape complete: ${result.jobsScraped} scraped, ` +
        `${result.jobsSaved} saved, ${result.jobsSkipped} skipped, ` +
        `${result.errors.length} errors`
      );

      return result;
    } catch (error) {
      result.errors.push(`Scraper crashed: ${(error as Error).message}`);
      console.error("[Keejob] Scraper error:", error);
      return result;
    }
  }

  /**
   * Parse job listings from HTML
   * 
   * NOTE: These selectors are PLACEHOLDER patterns based on common job board structures.
   * They MUST be updated to match Keejob's actual HTML structure.
   */
  private async parseJobListings(html: string): Promise<ScrapedJob[]> {
    const $ = this.loadHTML(html);
    const jobs: ScrapedJob[] = [];

    // Common selector patterns for job boards
    // Adjust these based on actual Keejob HTML structure
    const possibleSelectors = [
      ".job-listing",
      ".job-item",
      ".job-card",
      ".offer-item",
      "article.job",
      "[data-job-id]",
    ];

    let jobElements: cheerio.Cheerio<any> | null = null;

    // Try to find job listings
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        jobElements = elements;
        console.log(`[Keejob] Using selector: ${selector} (${elements.length} found)`);
        break;
      }
    }

    if (!jobElements || jobElements.length === 0) {
      console.warn("[Keejob] No job listings found. HTML structure may have changed.");
      // Log first 500 chars of HTML for debugging
      console.log("[Keejob] HTML preview:", html.substring(0, 500));
      return jobs;
    }

    // Parse each job listing
    jobElements.each((index, element) => {
      try {
        const $job = $(element);

        // Extract job link and ID
        const jobLink = $job.find("a[href*='offre'], a[href*='job'], a.job-link").first();
        const href = jobLink.attr("href");
        
        if (!href) {
          console.warn(`[Keejob] No link found for job ${index}`);
          return; // Skip this job
        }

        const fullUrl = href.startsWith("http") ? href : `${this.config.baseUrl}${href}`;
        const externalId = this.extractJobId(fullUrl);

        if (!externalId) {
          console.warn(`[Keejob] Could not extract ID from URL: ${fullUrl}`);
          return;
        }

        // Extract job data
        const title = this.normalizeText(
          jobLink.text() ||
          $job.find(".job-title, .title, h2, h3").first().text()
        );

        const companyName = this.normalizeText(
          $job.find(".company, .company-name, .employer").first().text() || "Entreprise non spécifiée"
        );

        const location = this.normalizeText(
          $job.find(".location, .city, .place").first().text() || "Tunisie"
        );

        const type = this.normalizeText(
          $job.find(".job-type, .contract-type, .type").first().text() || "CDI"
        );

        const description = this.normalizeText(
          $job.find(".description, .job-description").first().text() ||
          title // Fallback to title if no description on listing page
        );

        const category = this.normalizeText(
          $job.find(".category, .sector, .domain").first().text()
        ) || undefined;

        // Posted date
        const dateText = this.normalizeText(
          $job.find(".date, .posted-date, .publish-date, time").first().text()
        );
        const postedDate = dateText ? this.parseRelativeDate(dateText) : undefined;

        // Validate required fields
        const job: Partial<ScrapedJob> = {
          externalId,
          externalUrl: fullUrl,
          title,
          companyName,
          location,
          type,
          description,
          category,
          postedDate,
        };

        if (this.validateJob(job)) {
          jobs.push(job);
        } else {
          console.warn(`[Keejob] Invalid job data:`, job);
        }
      } catch (error) {
        console.error(`[Keejob] Error parsing job ${index}:`, error);
      }
    });

    return jobs;
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string | null {
    // Try to extract ID from URL patterns like:
    // /offre/123456
    // /job-details/123456
    // /offre-emploi-123456.html
    const patterns = [
      /\/offre[/-](\d+)/,
      /\/job[/-](\d+)/,
      /\/emploi[/-](\d+)/,
      /offre-emploi-(\d+)/,
      /job-id[=_](\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: use last segment if numeric
    const segments = url.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const numericMatch = lastSegment.match(/(\d+)/);
    
    if (numericMatch) {
      return numericMatch[1];
    }

    // Last resort: hash the URL
    return Buffer.from(url).toString("base64").substring(0, 16);
  }

  /**
   * Scrape individual job details (optional enhancement)
   * Fetch full job description from detail page
   */
  async scrapeJobDetails(jobUrl: string): Promise<Partial<ScrapedJob> | null> {
    const html = await this.fetchHTML(jobUrl);
    if (!html) return null;

    const $ = this.loadHTML(html);

    try {
      const description = this.normalizeText(
        $(".job-description, .description, .content, article").first().text()
      );

      // Extract skills if available
      const skillElements = $(".skills li, .competences li, .tags .tag");
      const skills: string[] = [];
      skillElements.each((_, el) => {
        const skill = this.normalizeText($(el).text());
        if (skill) skills.push(skill);
      });

      return {
        description: description || undefined,
        skills: skills.length > 0 ? skills : undefined,
      };
    } catch (error) {
      console.error(`[Keejob] Error parsing job details:`, error);
      return null;
    }
  }
}
