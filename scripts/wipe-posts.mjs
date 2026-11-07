/**
 * Empty Posts tables in Supabase — no seed.
 *   npm run db:wipe-posts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const i = trimmed.indexOf("=");
      const key = trimmed.slice(0, i).trim();
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL / DIRECT_URL");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

await prisma.$executeRawUnsafe(`
  TRUNCATE TABLE
    "comment_likes",
    "post_poll_votes",
    "post_hides",
    "post_likes",
    "post_bookmarks",
    "post_comments",
    "post_reports",
    "post_moderation_logs",
    "post_tags",
    "posts"
  RESTART IDENTITY CASCADE
`);

const posts = await prisma.post.count();
console.log(JSON.stringify({ ok: true, wiped: "posts-only", posts }, null, 2));
await prisma.$disconnect();
