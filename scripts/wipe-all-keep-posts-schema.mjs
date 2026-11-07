/**
 * 1) Empty every Posts Management table
 * 2) Wipe / drop non-posts app entities (catalog, letters, profiles)
 *
 *   npm run db:wipe-all
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

const POSTS_TABLES = [
  "comment_likes",
  "post_poll_votes",
  "post_hides",
  "post_likes",
  "post_bookmarks",
  "post_comments",
  "post_reports",
  "post_moderation_logs",
  "post_tags",
  "posts",
];

const NON_POSTS_TABLES = [
  "application_letters",
  "letter_usage_events",
  "catalog_applications",
  "candidate_profiles",
  "catalog_jobs",
  "catalog_companies",
];

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    name,
  );
  return Boolean(rows?.[0]?.exists);
}

async function main() {
  // 1) Empty posts module
  const postsPresent = [];
  for (const t of POSTS_TABLES) {
    if (await tableExists(t)) postsPresent.push(t);
  }
  if (postsPresent.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${postsPresent.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  }

  // 2) Remove non-posts entities (data + drop tables)
  const dropped = [];
  const missing = [];
  for (const t of NON_POSTS_TABLES) {
    if (!(await tableExists(t))) {
      missing.push(t);
      continue;
    }
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    dropped.push(t);
  }

  const postsCount = (await tableExists("posts"))
    ? await prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM posts`)
    : [{ c: 0 }];

  console.log(
    JSON.stringify(
      {
        ok: true,
        postsEmptied: postsPresent,
        postsCount: postsCount[0]?.c ?? 0,
        nonPostsDropped: dropped,
        alreadyAbsent: missing,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
