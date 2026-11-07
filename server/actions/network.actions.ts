"use server";

import { getOptionalServerUser, verifyServerUser } from "@/server/lib/auth-server";
import {
  listNetworkState,
  toggleFollow,
  toggleConnect,
  companyFollowersSummary,
  companyConnectionStatus,
  setCompanyBlocked,
  respondToConnectionRequest,
  connectToCompany,
  type NetworkTargetType,
} from "@/server/services/network.service";

export async function companyFollowersSummaryAction(companyId: string) {
  const viewer = await getOptionalServerUser();
  return companyFollowersSummary(companyId, viewer);
}

export async function companyConnectionStatusAction(companyId: string) {
  return companyConnectionStatus(await verifyServerUser(), companyId);
}

export async function listNetworkStateAction() {
  const user = await verifyServerUser();
  return listNetworkState(user);
}

export async function toggleFollowAction(type: NetworkTargetType, targetId: string) {
  const user = await verifyServerUser();
  return toggleFollow(user, type, targetId);
}

export async function setCompanyBlockedAction(companyId: string, blocked: boolean) {
  const user = await verifyServerUser();
  return setCompanyBlocked(user, companyId, blocked);
}

export async function toggleConnectAction(candidateId: string) {
  const user = await verifyServerUser();
  return toggleConnect(user, candidateId);
}

export async function respondToConnectionRequestAction(requesterId: string, accept: boolean) {
  const user = await verifyServerUser();
  return respondToConnectionRequest(user, requesterId, accept);
}

export async function connectToCompanyAction(companyId: string) {
  return connectToCompany(await verifyServerUser(), companyId);
}
