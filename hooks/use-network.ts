"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listNetworkStateAction,
  toggleConnectAction,
  toggleFollowAction,
  setCompanyBlockedAction,
  respondToConnectionRequestAction,
} from "@/server/actions/network.actions";
import type { ConnectStatus, NetworkTargetType } from "@/lib/network";

type NetworkCache = {
  follows: Set<string>;
  connects: Map<string, ConnectStatus>;
  blockedCompanies: Set<string>;
  incomingRequests: Array<{ requesterId: string; name: string; role: string; href: string; createdAt: string | null }>;
};

function emptyCache(): NetworkCache {
  return { follows: new Set(), connects: new Map(), blockedCompanies: new Set(), incomingRequests: [] };
}

function followKey(type: NetworkTargetType, id: string) {
  return `${type}:${id}`;
}

export function useNetwork() {
  const { user, ready } = useAuth();
  const userId = user?.id ?? "";
  const [cache, setCache] = useState<NetworkCache>(emptyCache);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setCache(emptyCache());
      setLoaded(true);
      return;
    }
    try {
      const data = await listNetworkStateAction();
      const follows = new Set(data.follows.map((item) => followKey(item.type, item.id)));
      const connects = new Map<string, ConnectStatus>();
      for (const row of data.connects) {
        // Prefer connected if any side is connected
        const prev = connects.get(row.candidateId);
        if (prev === "connected") continue;
        connects.set(row.candidateId, row.status);
      }
      setCache({ follows, connects, blockedCompanies: new Set(data.blockedCompanies ?? []), incomingRequests: data.incomingRequests ?? [] });
    } catch {
      setCache(emptyCache());
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [ready, reload]);

  useEffect(() => {
    const refreshState = () => { if (userId) void reload(); };
    window.addEventListener("smartapply:network-updated", refreshState);
    return () => window.removeEventListener("smartapply:network-updated", refreshState);
  }, [userId, reload]);

  useEffect(() => {
    if (!userId) return;
    const interval = window.setInterval(() => { void reload(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [userId, reload]);

  const following = useCallback(
    (type: NetworkTargetType, id: string) => cache.follows.has(followKey(type, id)),
    [cache.follows],
  );

  const follow = useCallback(
    (type: NetworkTargetType, id: string) => {
      if (!userId) return false;
      const key = followKey(type, id);
      const was = cache.follows.has(key);
      // Optimistic UI
      setCache((prev) => {
        const follows = new Set(prev.follows);
        if (was) follows.delete(key);
        else follows.add(key);
        return { ...prev, follows };
      });
      void toggleFollowAction(type, id)
        .then((res) => {
          setCache((prev) => {
            const follows = new Set(prev.follows);
            if (res.following) follows.add(key);
            else follows.delete(key);
            return { ...prev, follows };
          });
          window.dispatchEvent(new Event("smartapply:network-updated"));
        })
        .catch(() => {
          // rollback
          setCache((prev) => {
            const follows = new Set(prev.follows);
            if (was) follows.add(key);
            else follows.delete(key);
            return { ...prev, follows };
          });
        });
      return !was;
    },
    [userId, cache.follows],
  );

  const statusOf = useCallback(
    (candidateId: string): ConnectStatus => cache.connects.get(candidateId) ?? "none",
    [cache.connects],
  );

  const blockedCompany = useCallback(
    (companyId: string) => cache.blockedCompanies.has(companyId),
    [cache.blockedCompanies],
  );

  const setBlockedCompany = useCallback(async (companyId: string, blocked: boolean) => {
    if (!userId) throw new Error("Connexion requise.");
    const previous = cache.blockedCompanies.has(companyId);
    const wasFollowing = cache.follows.has(followKey("company", companyId));
    setCache((state) => {
      const blockedCompanies = new Set(state.blockedCompanies);
      if (blocked) blockedCompanies.add(companyId);
      else blockedCompanies.delete(companyId);
      const follows = new Set(state.follows);
      if (blocked) follows.delete(followKey("company", companyId));
      return { ...state, blockedCompanies, follows };
    });
    try {
      await setCompanyBlockedAction(companyId, blocked);
      window.dispatchEvent(new Event("smartapply:network-updated"));
    } catch (error) {
      setCache((state) => {
        const blockedCompanies = new Set(state.blockedCompanies);
        if (previous) blockedCompanies.add(companyId);
        else blockedCompanies.delete(companyId);
        const follows = new Set(state.follows);
        if (wasFollowing) follows.add(followKey("company", companyId));
        return { ...state, blockedCompanies, follows };
      });
      throw error;
    }
  }, [userId, cache.blockedCompanies, cache.follows]);

  const connect = useCallback(
    (candidateId: string) => {
      if (!userId) return "none" as ConnectStatus;
      const prev = cache.connects.get(candidateId) ?? "none";
      const optimistic: ConnectStatus = prev === "none" ? "pending" : prev === "pending" ? "none" : "none";
      setCache((state) => {
        const connects = new Map(state.connects);
        if (optimistic === "none") connects.delete(candidateId);
        else connects.set(candidateId, optimistic);
        return { ...state, connects };
      });
      void toggleConnectAction(candidateId)
        .then((res) => {
          setCache((state) => {
            const connects = new Map(state.connects);
          if (res.status === "none") connects.delete(candidateId);
          else connects.set(candidateId, res.status);
            return { ...state, connects };
          });
        window.dispatchEvent(new Event("smartapply:network-updated"));
        })
        .catch(() => {
          setCache((state) => {
            const connects = new Map(state.connects);
            if (prev === "none") connects.delete(candidateId);
            else connects.set(candidateId, prev);
            return { ...state, connects };
          });
        });
      return optimistic;
    },
    [userId, cache.connects],
  );

  const respondToRequest = useCallback(async (requesterId: string, accept: boolean) => {
    const result = await respondToConnectionRequestAction(requesterId, accept);
    setCache((state) => ({
      ...state,
      incomingRequests: state.incomingRequests.filter((request) => request.requesterId !== requesterId),
      connects: accept ? new Map(state.connects).set(requesterId, "connected") : state.connects,
    }));
    window.dispatchEvent(new Event("smartapply:network-updated"));
    return result;
  }, []);

  return {
    userId,
    following,
    follow,
    blockedCompany,
    setBlockedCompany,
    statusOf,
    connect,
    incomingRequests: cache.incomingRequests,
    respondToRequest,
    ready: Boolean(userId) && loaded,
    refresh: reload,
  };
}
