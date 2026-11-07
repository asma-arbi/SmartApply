"use client";

import { useEffect } from "react";
import {
  recordPostImpressionAction,
  recordProfileViewAction,
} from "@/server/actions/analytics.actions";

function sessionId() {
  const key = "smartapply-analytics-session";
  let value = window.sessionStorage.getItem(key);
  if (!value) {
    value = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, value);
  }
  return value;
}

export function PostImpressionTracker({ postId, targetId }: { postId: string; targetId: string }) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !("IntersectionObserver" in window)) return;
    const key = `smartapply-impression:${postId}`;
    if (window.sessionStorage.getItem(key)) return;
    let timer: number | undefined;
    let attempted = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.5 && !timer && !attempted) {
        timer = window.setTimeout(() => {
          timer = undefined;
          attempted = true;
          void recordPostImpressionAction(postId, sessionId())
            .then((result) => {
              if (!result.recorded) return;
              window.sessionStorage.setItem(key, "1");
              window.dispatchEvent(new Event("smartapply:analytics-updated"));
            })
            .catch(() => { attempted = false; });
        }, 1000);
      } else if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [0, 0.5] });
    observer.observe(target);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [postId, targetId]);
  return null;
}

export function ProfileViewTracker({
  profileType,
  profileId,
  enabled,
}: {
  profileType: "CANDIDATE" | "COMPANY";
  profileId: string;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled || !profileId) return;
    const key = `smartapply-profile-view:${profileType}:${profileId}`;
    if (window.sessionStorage.getItem(key)) return;
    const timer = window.setTimeout(() => {
      void recordProfileViewAction(profileType, profileId, sessionId())
        .then((result) => {
          if (!result.recorded) return;
          window.sessionStorage.setItem(key, "1");
          window.dispatchEvent(new Event("smartapply:analytics-updated"));
        })
        .catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, profileId, profileType]);
  return null;
}
