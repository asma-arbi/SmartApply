import { isUuid } from "@/lib/mappers";
import type { PostInput } from "@/types/post";

export function toPostPayload(input: PostInput, forUpdate = false) {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    body: input.content.trim(),
    category: input.category,
    tags: input.tags,
    language: input.language,
    source: input.origin === "imported" ? "IMPORTED" : "MANUAL",
    publish: input.status === "PUBLISHED",
  };
  if (input.excerpt?.trim()) body.excerpt = input.excerpt.trim();
  if (input.sourceUrl?.trim()) {
    body.sourceUrl = input.sourceUrl.trim();
    body.sourceName = input.sourceLabel?.trim() || undefined;
  }
  if (input.coverImageUrl?.trim()) body.coverImageUrl = input.coverImageUrl.trim();
  if (input.companyId && isUuid(input.companyId)) body.companyId = input.companyId;
  if (input.jobId && isUuid(input.jobId)) body.jobId = input.jobId;
  else if (forUpdate && !input.jobId) body.unlinkJob = true;
  if (input.postKind) body.postKind = input.postKind;
  if (input.visibility) body.visibility = input.visibility;
  if (input.commentMode) body.commentMode = input.commentMode;
  if (input.media?.length) body.media = input.media;
  if (input.poll) body.poll = input.poll;
  if (input.event) body.event = input.event;
  if (input.celebration) body.celebration = input.celebration;
  if (input.jobDetails) body.jobDetails = input.jobDetails;
  if (input.scheduledAt) body.scheduledAt = input.scheduledAt;
  if (input.pinned) body.pinned = true;
  if (input.mentions?.length) body.mentions = input.mentions;
  if (input.repostOfId) body.repostOfId = input.repostOfId;
  if (forUpdate) delete body.publish;
  return body;
}
