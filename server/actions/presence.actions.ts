"use server";

import { verifyServerUser } from "@/server/lib/auth-server";
import { updatePresence } from "@/server/services/presence.service";

export async function heartbeatPresenceAction() {
  return updatePresence(await verifyServerUser());
}
