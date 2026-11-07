/**
 * Feature flags for Posts Management — all optional options ON.
 * Everything is persisted to MongoDB via the posts API.
 */
export const POST_FEATURES = {
  multiReactions: true,
  nestedComments: true,
  repost: true,
  polls: true,
  documents: true,
  schedule: true,
  pin: true,
  mentions: true,
  hide: true,
  shareCount: true,
  funnyReaction: true,
} as const;

export type PostFeature = keyof typeof POST_FEATURES;

export function isPostFeatureEnabled(feature: PostFeature) {
  return POST_FEATURES[feature];
}

