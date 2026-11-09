import { BaseScraper, type ScrapedJob, type ScrapeResult } from "./base-scraper";
import { SCRAPER_CONFIG } from "../scraper-config";
import { saveExternalJob } from "../external-scraper";

/**
 * Emploi.tn scraper for Tunisia government job opportunities
 * 
 * Note: This implementation is based on common HTML structure patterns.
 * The actual selectors may need adjustment based on Emploi.tn's current layout.
 */
export class EmploiScraper extends BaseScraper {
  constructor() {
    super(SCRAPER_CONFIG.sources.emploi, "emploi.tn");
  }

  /**
   * Scrape jobs from Emploi.tn
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
      console.log(`[Emploi.tn] Starting scrape (max ${maxPages} pages)...`);

      // Scrape multiple pages
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1
          ? `${this.config.baseUrl}/offres.php`
          : `${this.config.baseUrl}/offres.php?page=${page}`;

        console.log(`[Emploi.tn] Fetching page ${page}...`);
        const html = await this.fetchHTML(pageUrl);

        if (!html) {
          result.errors.push(`Failed to fetch page ${page}`);
          continue;
        }

        const jobs = await this.parseJobListings(html);
        console.log(`[Emploi.tn] Found ${jobs.length} jobs on page ${page}`);

        for (const job of jobs) {
          result.jobsScraped++;

          // Save to database
          const saveResult = await saveExternalJob({
            source: "emploi.tn",
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
        `[Emploi.tn] Scrape complete: ${result.jobsScraped} scraped, ` +
        `${result.jobsSaved} saved, ${result.jobsSkipped} skipped, ` +
        `${result.errors.length} errors`
      );

      return result;
    } catch (error) {
      result.errors.push(`Scraper crashed: ${(error as Error).message}`);
      console.error("[Emploi.tn] Scraper error:", error);
      return result;
    }
  }

  /**
   * Parse job listings from HTML
   * 
   * NOTE: These selectors are PLACEHOLDER patterns based on common job board structures.
   * They MUST be updated to match Emploi.tn's actual HTML structure.
   */
  private async parseJobListings(html: string): Promise<ScrapedJob[]> {
    const $ = this.loadHTML(html);
    const jobs: ScrapedJob[] = [];

    // Common selector patterns for job boards
    const possibleSelectors = [
      ".offer-item",
      ".job-listing",
      ".job-item",
      ".offre",
      "tr.job-row",
      "[id^='offre']",
    ];

    let jobElements: cheerio.Cheerio<any> | null = null;

    // Try to find job listings
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        jobElements = elements;
        console.log(`[Emploi.tn] Using selector: ${selector} (${elements.length} found)`);
        break;
      }
    }

    if (!jobElements || jobElements.length === 0) {
      console.warn("[Emploi.tn] No job listings found. HTML structure may have changed.");
      return jobs;
    }

    // Parse each job listing
    jobElements.each((index, element) => {
      try {
        const $job = $(element);

        // Extract job link and ID
        const jobLink = $job.find("a[href*='offre'], a[href*='detail']").first();
        const href = jobLink.attr("href");
        
        if (!href) {
          return; // Skip this job
        }

        const fullUrl = href.startsWith("http") ? href : `${this.config.baseUrl}/${href}`;
        const externalId = this.extractJobId(fullUrl);

        if (!externalId) {
          return;
        }

        // Extract job data
        const title = this.normalizeText(
          jobLink.text() ||
          $job.find(".titre, .title, .job-title, h3, h4").first().text()
        );

        const companyName = this.normalizeText(
          $job.find(".entreprise, .company, .employeur").first().text() || "Entreprise non spécifiée"
        );

        const location = this.normalizeText(
          $job.find(".lieu, .location, .ville").first().text() || "Tunisie"
        );

        const type = this.normalizeText(
          $job.find(".type-contrat, .contrat, .type").first().text() || "CDI"
        );

        const description = this.normalizeText(
          $job.find(".description, .resume").first().text() ||
          title
        );

        const category = this.normalizeText(
          $job.find(".secteur, .domaine, .category").first().text()
        ) || undefined;

        // Posted date
        const dateText = this.normalizeText(
          $job.find(".date-publication, .date, time").first().text()
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
        }
      } catch (error) {
        console.error(`[Emploi.tn] Error parsing job ${index}:`, error);
      }
    });

    return jobs;
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string | null {
    const patterns = [
      /offre[_-]?id[=_](\d+)/i,
      /detail[/-](\d+)/,
      /id[=_](\d+)/,
      /offre[/-](\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: hash the URL
    return Buffer.from(url).toString("base64").substring(0, 16);
  }
}
