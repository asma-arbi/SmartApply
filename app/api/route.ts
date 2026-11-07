import { ok } from "@/server/lib/api";
import { handleRoute } from "@/server/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleRoute(async () => {
  return ok({
    module: "posts-management",
    product: "SmartApply Tunisia",
    docs: "/api/docs",
  });
});
