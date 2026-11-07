"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listConversationsAction, listNetworkNotificationsAction } from "@/server/actions/messaging.actions";

export function useNotificationCounts() {
  const { user, ready } = useAuth();
  const [counts, setCounts] = useState({ messages: 0, network: 0, notifications: 0 });

  useEffect(() => {
    if (!ready || !user) {
      setCounts({ messages: 0, network: 0, notifications: 0 });
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [conversations, notifications] = await Promise.all([
          listConversationsAction(),
          listNetworkNotificationsAction(),
        ]);
        if (cancelled) return;
        setCounts({
          messages: conversations.reduce((total, conversation) => total + conversation.unread, 0),
          network: notifications.incomingRequests,
          notifications: notifications.unread,
        });
      } catch {
        // Preserve the last successful counts during a temporary connection issue.
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [ready, user]);

  return counts;
}
