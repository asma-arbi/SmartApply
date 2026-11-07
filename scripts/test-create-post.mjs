/**
 * Verify company can create a post end-to-end.
 *   node scripts/test-create-post.mjs
 */
import { createClient } from "@supabase/supabase-js";
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
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const email = "company.posts@smartapply.tn";
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = list.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error("User not found", email);
  process.exit(1);
}

const before = await prisma.post.count();
const post = await prisma.post.create({
  data: {
    authorId: user.id,
    title: "Verif Nouveau post",
    body: "Post de verification depuis le bouton Nouveau post — enregistre dans Supabase.",
    excerpt: "Verif Nouveau post",
    category: "COMPANY_ANNOUNCEMENT",
    status: "PUBLISHED",
    source: "MANUAL",
    publishedAt: new Date(),
    postKind: "TEXT",
    visibility: "PUBLIC",
    commentMode: "ANYONE",
    media: [],
    tags: { create: [{ tag: "verif" }] },
  },
});
const after = await prisma.post.count();
await prisma.$disconnect();

console.log(
  JSON.stringify(
    {
      ok: true,
      authorId: user.id,
      postId: post.id,
      status: post.status,
      before,
      after,
      open: `http://localhost:3000/posts/${post.id}`,
    },
    null,
    2,
  ),
);
