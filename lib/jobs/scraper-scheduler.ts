import { getDb } from "@/lib/mongodb";
import { getEnabledSources } from "./scraper-config";
import { KeejobScraper } from "./scrapers/keejob-scraper";
import { EmploiScraper } from "./scrapers/emploi-scraper";
import type { BaseScraper } from "./scrapers/base-scraper";

export interface ScraperRun {
  id: string;
  source: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "success" | "failed";
  jobs_found: number;
  jobs_saved: number;
  jobs_updated: number;
  jobs_skipped: number;
  errors: string[];
  triggered_by: "cron" | "manual";
  user_id?: string;
}

/**
 * Check if a scraper is currently running for a source
 */
async function isRunning(source: string): Promise<boolean> {
  const db = await getDb();
  const activeRun = await db.collection("scraper_runs").findOne({
    source,
    status: "running",
    started_at: { $gt: new Date(Date.now() - 3600000).toISOString() }, // Within last hour
  });

  return !!activeRun;
}

/**
 * Create scraper instance for source
 */
function createScraper(sourceName: string): BaseScraper | null {
  switch (sourceName) {
    case "Keejob":
      return new KeejobScraper();
    case "Emploi.tn":
      return new EmploiScraper();
    default:
      console.warn(`[Scheduler] Unknown source: ${sourceName}`);
      return null;
  }
}

/**
 * Run all enabled scrapers
 */
export async function runAllScrapers(
  triggeredBy: "cron" | "manual" = "cron",
  userId?: string
): Promise<{
  success: boolean;
  runs: ScraperRun[];
  errors: string[];
}> {
  const result = {
    success: true,
    runs: [] as ScraperRun[],
    errors: [] as string[],
  };

  const enabledSources = getEnabledSources();
  
  if (enabledSources.length === 0) {
    result.errors.push("No sources enabled");
    result.success = false;
    return result;
  }

  console.log(`[Scheduler] Running ${enabledSources.length} scrapers...`);

  for (const source of enabledSources) {
    try {
      // Check if already running
      if (await isRunning(source.name)) {
        console.log(`[Scheduler] ${source.name} already running, skipping...`);
        result.errors.push(`${source.name} already running`);
        continue;
      }

      const scraper = createScraper(source.name);
      if (!scraper) {
        result.errors.push(`Failed to create scraper for ${source.name}`);
        continue;
      }

      // Create run record
      const runId = crypto.randomUUID();
      const run: ScraperRun = {
        id: runId,
        source: source.name,
        started_at: new Date().toISOString(),
        status: "running",
        jobs_found: 0,
        jobs_saved: 0,
        jobs_updated: 0,
        jobs_skipped: 0,
        errors: [],
        triggered_by: triggeredBy,
        user_id: userId,
      };

      const db = await getDb();
      await db.collection("scraper_runs").insertOne(run as any);

      console.log(`[Scheduler] Starting ${source.name} scraper (run ${runId})...`);

      // Run scraper
      const scrapeResult = await scraper.scrape(3); // Max 3 pages

      // Update run record
      run.completed_at = new Date().toISOString();
      run.status = scrapeResult.success ? "success" : "failed";
      run.jobs_found = scrapeResult.jobsScraped;
      run.jobs_saved = scrapeResult.jobsSaved;
      run.jobs_updated = scrapeResult.jobsUpdated;
      run.jobs_skipped = scrapeResult.jobsSkipped;
      run.errors = scrapeResult.errors;

      await db.collection("scraper_runs").updateOne(
        { id: runId },
        { $set: {
          completed_at: run.completed_at,
          status: run.status,
          jobs_found: run.jobs_found,
          jobs_saved: run.jobs_saved,
          jobs_updated: run.jobs_updated,
          jobs_skipped: run.jobs_skipped,
          errors: run.errors,
        }}
      );

      result.runs.push(run);

      if (!scrapeResult.success) {
        result.success = false;
        result.errors.push(...scrapeResult.errors);
      }

      console.log(
        `[Scheduler] ${source.name} completed: ` +
        `${run.jobs_found} found, ${run.jobs_saved} saved, ` +
        `${run.jobs_skipped} skipped, ${run.errors.length} errors`
      );
    } catch (error) {
      const errorMsg = `${source.name} crashed: ${(error as Error).message}`;
      result.errors.push(errorMsg);
      result.success = false;
      console.error(`[Scheduler] ${errorMsg}`, error);
    }
  }

  console.log(
    `[Scheduler] All scrapers completed. ` +
    `Success: ${result.success}, Runs: ${result.runs.length}, Errors: ${result.errors.length}`
  );

  return result;
}

/**
 * Get recent scraper runs
 */
export async function getRecentRuns(limit: number = 20): Promise<ScraperRun[]> {
  const db = await getDb();
  const runs = await db
    .collection<ScraperRun>("scraper_runs")
    .find({})
    .sort({ started_at: -1 })
    .limit(limit)
    .toArray();

  return runs;
}

/**
 * Get scraper statistics
 */
export async function getScraperStats(): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalJobsFound: number;
  totalJobsSaved: number;
  lastRunAt?: string;
  sourceStats: { source: string; runs: number; jobsSaved: number }[];
}> {
  const db = await getDb();

  const allRuns = await db.collection<ScraperRun>("scraper_runs").find({}).toArray();

  const stats = {
    totalRuns: allRuns.length,
    successfulRuns: allRuns.filter((r) => r.status === "success").length,
    failedRuns: allRuns.filter((r) => r.status === "failed").length,
    totalJobsFound: allRuns.reduce((sum, r) => sum + r.jobs_found, 0),
    totalJobsSaved: allRuns.reduce((sum, r) => sum + r.jobs_saved, 0),
    lastRunAt: allRuns[0]?.started_at,
    sourceStats: [] as { source: string; runs: number; jobsSaved: number }[],
  };

  // Calculate per-source stats
  const sourceMap = new Map<string, { runs: number; jobsSaved: number }>();
  
  for (const run of allRuns) {
    const existing = sourceMap.get(run.source) || { runs: 0, jobsSaved: 0 };
    sourceMap.set(run.source, {
      runs: existing.runs + 1,
      jobsSaved: existing.jobsSaved + run.jobs_saved,
    });
  }

  stats.sourceStats = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    ...data,
  }));

  return stats;
}
