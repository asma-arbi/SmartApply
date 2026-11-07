import { ok, handleRoute } from "@/server/lib/api";
import { getOptionalUser } from "@/server/middleware/auth";
import { getFeedSidebar } from "@/server/services/feed-sidebar.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = handleRoute(async (req) => {
  const user = await getOptionalUser(req);
  return ok(await getFeedSidebar(user));
});
