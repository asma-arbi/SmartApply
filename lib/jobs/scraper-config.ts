/**
 * Scraper Configuration
 * 
 * Centralized configuration for all job scraper sources
 */

export interface ScraperSourceConfig {
  name: string;
  enabled: boolean;
  baseUrl: string;
  rateLimit: number; // requests per minute
  timeout: number; // milliseconds
  retries: number;
  userAgent: string;
}

export const SCRAPER_CONFIG = {
  // Global settings
  enabled: process.env.SCRAPER_ENABLED === "true",
  scheduleCron: process.env.SCRAPER_SCHEDULE_CRON || "0 */6 * * *", // Every 6 hours
  requestTimeout: parseInt(process.env.SCRAPER_REQUEST_TIMEOUT_MS || "10000", 10),
  maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || "3", 10),
  defaultRateLimit: parseInt(process.env.SCRAPER_RATE_LIMIT_PER_MINUTE || "30", 10),
  userAgent: process.env.SCRAPER_USER_AGENT || "SmartApplyBot/1.0 (+https://smartapply.tn/about)",

  // Source-specific configurations
  sources: {
    keejob: {
      name: "Keejob",
      enabled: process.env.SCRAPER_KEEJOB_ENABLED !== "false", // enabled by default
      baseUrl: "https://www.keejob.com",
      rateLimit: 20, // requests per minute
      timeout: 15000,
      retries: 3,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } as ScraperSourceConfig,

    emploi: {
      name: "Emploi.tn",
      enabled: process.env.SCRAPER_EMPLOI_ENABLED !== "false", // enabled by default
      baseUrl: "https://www.emploi.tn",
      rateLimit: 20,
      timeout: 15000,
      retries: 3,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } as ScraperSourceConfig,

    tanitjobs: {
      name: "Tanitjobs",
      enabled: process.env.SCRAPER_TANITJOBS_ENABLED === "true", // disabled by default
      baseUrl: "https://www.tanitjobs.com",
      rateLimit: 20,
      timeout: 15000,
      retries: 3,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } as ScraperSourceConfig,
  },
} as const;

/**
 * Get enabled sources
 */
export function getEnabledSources(): ScraperSourceConfig[] {
  if (!SCRAPER_CONFIG.enabled) return [];
  
  return Object.values(SCRAPER_CONFIG.sources).filter((source) => source.enabled);
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number = 60000; // 1 minute

  constructor(requestsPerMinute: number) {
    this.maxRequests = requestsPerMinute;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Calculate how long to wait
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Retry after waiting
      }
    }

    this.requests.push(now);
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay
 */
export function getBackoffDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
}
