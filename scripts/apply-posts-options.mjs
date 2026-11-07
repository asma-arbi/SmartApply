/**
 * Apply Posts-only option columns on Supabase (no catalog).
 *   node scripts/apply-posts-options.mjs
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
// Prefer direct (non-pooler) URL to avoid ALTER timeouts
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

await prisma.$executeRawUnsafe(`SET statement_timeout = '120s'`);
await prisma.$executeRawUnsafe(`SET lock_timeout = '30s'`);

const steps = [
  `ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'FUNNY'`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of_id uuid`,
  `CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON posts (scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS posts_pinned_at_idx ON posts (pinned_at DESC NULLS LAST)`,
  `CREATE INDEX IF NOT EXISTS posts_repost_of_id_idx ON posts (repost_of_id)`,
];

const results = [];
for (const sql of steps) {
  try {
    await prisma.$executeRawUnsafe(sql);
    results.push({ ok: true, sql: sql.slice(0, 60) });
    console.log("ok:", sql.slice(0, 72).replace(/\s+/g, " "));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ ok: false, sql: sql.slice(0, 60), message: message.slice(0, 200) });
    console.warn("warn:", message.slice(0, 200));
  }
}

await prisma.$disconnect();
console.log(JSON.stringify({ ok: true, scope: "posts-options-only", results }, null, 2));
