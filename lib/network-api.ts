import { api } from "@/lib/api";
import type { NetworkTargetType } from "@/lib/network";

export type NetworkStateDto = {
  follows: Array<{ type: NetworkTargetType; id: string }>;
  connects: Array<{
    candidateId: string;
    status: "pending" | "connected";
    direction: "in" | "out";
  }>;
};

export async function fetchNetworkState() {
  return api<NetworkStateDto>("/network");
}

export async function toggleFollowApi(type: NetworkTargetType, id: string) {
  return api<{ following: boolean }>("/network/follow", {
    method: "POST",
    body: JSON.stringify({ type, id }),
  });
}

export async function toggleConnectApi(candidateId: string) {
  return api<{ status: "none" | "pending" | "connected" }>("/network/connect", {
    method: "POST",
    body: JSON.stringify({ candidateId }),
  });
}
