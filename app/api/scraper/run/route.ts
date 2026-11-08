import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { runAllScrapers } from "@/lib/jobs/scraper-scheduler";
import { SCRAPER_CONFIG } from "@/lib/jobs/scraper-config";

/**
 * Manual scraper trigger endpoint (admin only)
 */
export async function POST() {
  try {
    // Check authentication and authorization
    const sessionData = await getSessionUser();

    if (!sessionData || sessionData.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Check if scraping is enabled
    if (!SCRAPER_CONFIG.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Scraper is disabled",
          message: "Set SCRAPER_ENABLED=true in environment variables",
        },
        { status: 400 }
      );
    }

    console.log(`[Manual] Scraper triggered by admin: ${sessionData.user.name}`);

    // Run scrapers
    const result = await runAllScrapers("manual", sessionData.user.id);

    return NextResponse.json({
      success: result.success,
      message: `Scraper completed: ${result.runs.length} sources processed`,
      runs: result.runs.map((run) => ({
        source: run.source,
        status: run.status,
        jobsFound: run.jobs_found,
        jobsSaved: run.jobs_saved,
        jobsSkipped: run.jobs_skipped,
        errors: run.errors,
        startedAt: run.started_at,
        completedAt: run.completed_at,
      })),
      errors: result.errors,
    }, { status: 200 });

  } catch (error) {
    console.error("[Manual] Failed to run scrapers:", error);
    
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
