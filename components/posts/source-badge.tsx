import { ExternalLink } from "lucide-react";
import type { Post } from "@/types/post";

/** Only imported posts show a source chip. Never show "Publié manuellement". */
export function SourceBadge({
  post,
}: {
  post: Post;
  /** ignored — kept for call-site compatibility */
  importedOnly?: boolean;
}) {
  if (post.origin !== "imported") return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="rounded-[8px] bg-[var(--sa-surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--sa-text-secondary)]">
        Importé
      </span>
      {post.sourceUrl ? (
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--sa-action)] hover:underline"
        >
          {post.sourceLabel || "Source"}
          <ExternalLink className="size-3" />
        </a>
      ) : null}
    </span>
  );
}
