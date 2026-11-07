import { PostListSkeleton } from "@/components/posts/post-list";

/** Shell offline pour la racine — affiché pendant le chargement ou hors ligne */
export default function RootLoading() {
  return <PostListSkeleton />;
}
