import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { ExternalJob, ExternalJobSource } from "@/lib/models/types";

/**
 * Generate content hash for deduplication
 */
function generateContentHash(title: string, company: string, location: string): string {
  const normalized = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Check if an external job already exists
 */
async function isDuplicate(
  source: ExternalJobSource,
  externalId: string,
  contentHash: string
): Promise<boolean> {
  const db = await getDb();
  
  // Check by external ID first (exact match)
  const exactMatch = await db.collection("external_jobs").findOne({
    source,
    external_id: externalId,
  });
  
  if (exactMatch) return true;

  // Check by content hash (similar job from same or different source)
  const hashMatch = await db.collection("external_jobs").findOne({
    content_hash: contentHash,
    is_active: true,
  });

  return !!hashMatch;
}

/**
 * Save scraped job to database
 */
export async function saveExternalJob(params: {
  source: ExternalJobSource;
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
}): Promise<{ saved: boolean; reason?: string; id?: string }> {
  try {
    const contentHash = generateContentHash(
      params.title,
      params.companyName,
      params.location
    );

    // Check for duplicates
    const duplicate = await isDuplicate(params.source, params.externalId, contentHash);
    if (duplicate) {
      return { saved: false, reason: "duplicate" };
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const externalJob: ExternalJob = {
      id: crypto.randomUUID(),
      source: params.source,
      external_id: params.externalId,
      external_url: params.externalUrl,
      title: params.title,
      company_name: params.companyName,
      location: params.location,
      type: params.type,
      description: params.description,
      category: params.category,
      skills: params.skills,
      posted_date: params.postedDate,
      scraped_at: now,
      last_checked_at: now,
      is_active: true,
      content_hash: contentHash,
      views_count: 0,
    };

    await db.collection("external_jobs").insertOne(externalJob as any);

    return { saved: true, id: externalJob.id };
  } catch (error) {
    console.error("[ExternalScraper] Failed to save job:", error);
    return { saved: false, reason: "error" };
  }
}

/**
 * Mark external job as inactive (no longer available on source)
 */
export async function markExternalJobInactive(
  source: ExternalJobSource,
  externalId: string
): Promise<void> {
  const db = await getDb();
  await db.collection("external_jobs").updateOne(
    { source, external_id: externalId },
    {
      $set: {
        is_active: false,
        last_checked_at: new Date().toISOString(),
      },
    }
  );
}

/**
 * Update last checked timestamp for external job
 */
export async function updateExternalJobCheck(
  source: ExternalJobSource,
  externalId: string
): Promise<void> {
  const db = await getDb();
  await db.collection("external_jobs").updateOne(
    { source, external_id: externalId },
    {
      $set: {
        last_checked_at: new Date().toISOString(),
      },
    }
  );
}

/**
 * Get active external jobs for display
 */
export async function getActiveExternalJobs(
  filters?: {
    source?: ExternalJobSource;
    category?: string;
    limit?: number;
    skip?: number;
  }
): Promise<ExternalJob[]> {
  const db = await getDb();
  
  const query: any = { is_active: true };
  
  if (filters?.source) {
    query.source = filters.source;
  }
  
  if (filters?.category) {
    query.category = filters.category;
  }

  const jobs = await db
    .collection<ExternalJob>("external_jobs")
    .find(query)
    .sort({ scraped_at: -1 })
    .limit(filters?.limit || 50)
    .skip(filters?.skip || 0)
    .toArray();

  return jobs;
}

/**
 * Increment view count for external job
 */
export async function incrementExternalJobViews(jobId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("external_jobs").updateOne(
      { id: jobId },
      { $inc: { views_count: 1 } }
    );
  } catch (error) {
    console.error("[ExternalScraper] Failed to increment views:", error);
  }
}

/**
 * Clean up old inactive external jobs (older than 30 days)
 */
export async function cleanupOldExternalJobs(): Promise<number> {
  try {
    const db = await getDb();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.collection("external_jobs").deleteMany({
      is_active: false,
      last_checked_at: { $lt: thirtyDaysAgo.toISOString() },
    });

    return result.deletedCount || 0;
  } catch (error) {
    console.error("[ExternalScraper] Failed to cleanup:", error);
    return 0;
  }
}

/**
 * Scrape jobs from Keejob (placeholder - needs implementation)
 * This is a placeholder for the actual scraping logic
 */
export async function scrapeKeejobJobs(): Promise<{
  success: boolean;
  jobsScraped: number;
  jobsSaved: number;
  errors: string[];
}> {
  const result = {
    success: false,
    jobsScraped: 0,
    jobsSaved: 0,
    errors: [] as string[],
  };

  try {
    // TODO: Implement actual scraping logic
    // This would involve:
    // 1. Fetching job listings from Keejob website
    // 2. Parsing HTML/JSON responses
    // 3. Extracting job data
    // 4. Saving using saveExternalJob()
    
    // For now, return a placeholder response
    result.errors.push("Scraping not yet implemented - requires legal approval and implementation");
    
    return result;
  } catch (error) {
    result.errors.push(`Scraping failed: ${(error as Error).message}`);
    return result;
  }
}
