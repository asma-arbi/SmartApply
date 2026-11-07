"use server";

import { getOptionalServerUser } from "@/server/lib/auth-server";
import { getFeedSidebar } from "@/server/services/feed-sidebar.service";

export async function getFeedSidebarAction() {
  return getFeedSidebar(await getOptionalServerUser());
}
