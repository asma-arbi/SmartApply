"use server";

import { getOptionalServerUser } from "@/server/lib/auth-server";
import { recordPostImpression, recordProfileView } from "@/server/services/analytics.service";

export async function recordPostImpressionAction(postId: string, sessionId: string) {
  const user = await getOptionalServerUser();
  return recordPostImpression(user, postId, sessionId);
}

export async function recordProfileViewAction(
  profileType: "CANDIDATE" | "COMPANY",
  profileId: string,
  sessionId: string,
) {
  const user = await getOptionalServerUser();
  return recordProfileView(user, profileType, profileId, sessionId);
}
