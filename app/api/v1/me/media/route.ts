import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ok, fail } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);
const MAX_BYTES = 25 * 1024 * 1024;

function extFor(type: string, name: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  if (type === "application/pdf") return "pdf";
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "jpg";
}

function mediaKind(type: string): "image" | "video" | "document" {
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "document";
  return "image";
}

export const POST = withAuth(async (req) => {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return fail(400, "BAD_REQUEST", "Fichier requis (champ file).");
  }
  if (!ALLOWED.has(file.type)) {
    return fail(400, "UNSUPPORTED_TYPE", "Formats : JPG, PNG, WebP, GIF, MP4, WebM, PDF.");
  }
  if (file.size > MAX_BYTES) {
    return fail(400, "FILE_TOO_LARGE", "Fichier trop lourd (max 25 Mo).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extFor(file.type, file.name);
  const kind = mediaKind(file.type);
  const dir = path.join(process.cwd(), "public", "uploads", "posts");
  await mkdir(dir, { recursive: true });

  const filename = `${req.user.id}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  const url = `/uploads/posts/${filename}`;

  return ok({
    url,
    type: kind,
    name: file.name.slice(0, 180),
  });
});
