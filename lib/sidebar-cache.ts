import type { FeedSidebarData } from "@/lib/posts-api";
import { getFeedSidebarAction } from "@/server/actions/feed.actions";

const EMPTY: FeedSidebarData = {
  myStats: {
    publishedPosts: 0,
    draftPosts: 0,
    reactionsReceived: 0,
    commentsReceived: 0,
    bookmarks: 0,
    profileViews: 0,
    impressions: 0,
  },
  trendingTags: [],
  suggestedCompanies: [],
  suggestedCandidates: [],
  careerTips: [],
};

const cache = new Map<string, { at: number; data: FeedSidebarData }>();
const inflight = new Map<string, Promise<FeedSidebarData>>();

const TTL_MS = 60_000;

/** Deduped sidebar fetch shared by left + right rails. */
export async function getCachedFeedSidebar(force = false, cacheKey = "guest"): Promise<FeedSidebarData> {
  const entry = cache.get(cacheKey);
  if (!force && entry && Date.now() - entry.at < TTL_MS) return entry.data;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const request = getFeedSidebarAction()
    .then((data) => {
      cache.set(cacheKey, { at: Date.now(), data });
      return data;
    })
    .catch(() => cache.get(cacheKey)?.data ?? EMPTY)
    .finally(() => {
      inflight.delete(cacheKey);
    });
  inflight.set(cacheKey, request);
  return request;
}
