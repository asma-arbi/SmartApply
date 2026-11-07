"use client";

import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Post, ReactionType } from "@/types/post";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { PostCard } from "@/components/posts/post-card";

type PostListProps = {
  posts: Post[];
  canManage?: boolean;
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onLike: (id: string, type?: ReactionType) => void;
  onBookmark: (id: string) => void;
  onComment?: (id: string, content: string, parentId?: string) => void | Promise<void>;
  onTag?: (tag: string) => void;
  onDelete?: (post: Post) => void;
  onArchive?: (id: string) => void;
  onPublish?: (id: string) => void;
  onRestore?: (id: string) => void;
};

export function PostList({
  posts,
  canManage = false,
  compact = false,
  emptyTitle = "Aucune annonce",
  emptyDescription = "Modifiez les filtres, ou publiez une nouvelle annonce.",
  emptyAction,
  onLike,
  onBookmark,
  onComment,
  onTag,
  onDelete,
  onArchive,
  onPublish,
  onRestore,
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          canManage={canManage}
          compact={compact}
          onLike={onLike}
          onBookmark={onBookmark}
          onComment={onComment}
          onTag={onTag}
          onDelete={onDelete}
          onArchive={onArchive}
          onPublish={onPublish}
          onRestore={onRestore}
        />
      ))}
    </div>
  );
}

export function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex gap-4 p-5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
