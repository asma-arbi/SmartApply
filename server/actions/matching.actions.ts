"use server";

import { verifyServerUser } from "@/server/lib/auth-server";
import { ForbiddenError } from "@/server/lib/errors";
import { jobMatchesForCandidate } from "@/server/services/matching.service";

export async function getJobMatchesAction() {
  const user = await verifyServerUser();
  if (user.role !== "CANDIDATE") throw new ForbiddenError("Les recommandations d’offres sont réservées aux candidats.");

  return jobMatchesForCandidate(user);
}
