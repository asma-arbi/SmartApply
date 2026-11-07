import type { Post } from "@/types/post";

const KEY = "smartapply:new-post";

export function stashNewPost(post: Post) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(post));
  } catch {
    /* ignore quota */
  }
}

export function takeNewPost(): Post | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as Post;
  } catch {
    return null;
  }
}
