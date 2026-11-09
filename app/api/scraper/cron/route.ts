import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/jobs/scraper-scheduler";
import { SCRAPER_CONFIG } from "@/lib/jobs/scraper-config";

/**
 * Vercel Cron endpoint for automated scraping
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/scraper/cron",
 *     "schedule": "every six hours"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization header (Vercel Cron specific)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if scraping is enabled
    if (!SCRAPER_CONFIG.enabled) {
      return NextResponse.json(
        { message: "Scraper is disabled", success: true },
        { status: 200 }
      );
    }

    console.log("[Cron] Starting scheduled scraper run...");

    // Run scrapers
    const result = await runAllScrapers("cron");

    return NextResponse.json({
      success: result.success,
      message: `Scraper run completed: ${result.runs.length} sources processed`,
      runs: result.runs,
      errors: result.errors,
    }, { status: 200 });

  } catch (error) {
    console.error("[Cron] Failed to run scrapers:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
