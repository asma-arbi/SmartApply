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
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const p = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

try {
  const [posts, likes, comments, bookmarks, reports, letters, usage, companies, jobs, hides] =
    await Promise.all([
      p.post.count(),
      p.postLike.count(),
      p.postComment.count(),
      p.postBookmark.count(),
      p.postReport.count(),
      p.applicationLetter.count(),
      p.letterUsageEvent.count(),
      p.company.count(),
      p.job.count(),
      p.postHide.count(),
    ]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        posts,
        likes,
        comments,
        bookmarks,
        reports,
        letters,
        usage,
        companies,
        jobs,
        hides,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error("DB_ERR", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await p.$disconnect();
}
