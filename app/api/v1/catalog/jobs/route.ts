import { handleRoute, ok, parseQuery } from "@/server/lib/api";
import { listPublishedJobs } from "@/server/services/catalog";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const Query = z.object({
  companyId: z.string().uuid().optional(),
});

export const GET = handleRoute(async (req) => {
  const query = parseQuery(req, Query);
  const items = await listPublishedJobs(query.companyId);
  return ok({
    items: items.map((job) => ({
      id: job.id,
      companyId: job.companyId,
      title: job.title,
      city: job.city,
      type: job.type,
      language: job.language,
      description: job.description,
    })),
  });
});
