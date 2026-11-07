import { ok } from "@/server/lib/api";
import { handleRoute } from "@/server/lib/api";
import { listCompaniesWithJobs } from "@/server/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = handleRoute(async () => {
  return ok({ items: await listCompaniesWithJobs() });
});
