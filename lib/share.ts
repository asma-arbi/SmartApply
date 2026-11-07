export function postUrl(post: { id: string }) {
  if (typeof window === "undefined") return `/posts/${post.id}`;
  return `${window.location.origin}/posts/${post.id}`;
}

export async function copyPostLink(post: { id: string }) {
  const url = postUrl(post);
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Copie impossible sur ce navigateur.");
  }
  await navigator.clipboard.writeText(url);
  return url;
}

export async function sharePost(post: { id: string; title: string }) {
  const url = postUrl(post);

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: post.title, text: post.title, url });
    return "shared" as const;
  }

  await copyPostLink(post);
  return "copied" as const;
}

export function sharePostByEmail(post: { id: string; title: string }) {
  const url = postUrl(post);
  const subject = encodeURIComponent(post.title);
  const body = encodeURIComponent(`${post.title}\n\n${url}`);
  window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
}

export function sharePostOnWhatsApp(post: { id: string; title: string }) {
  const url = postUrl(post);
  const text = encodeURIComponent(`${post.title}\n${url}`);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
