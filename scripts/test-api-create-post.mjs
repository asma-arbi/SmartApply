/**
 * End-to-end: login company → POST /posts → confirm in DB
 *   node scripts/test-api-create-post.mjs
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms),
    ),
  ]);
}

async function main() {
  const loginRes = await withTimeout(
    fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "company.posts@smartapply.tn",
        password: "TestPosts123!",
      }),
    }),
    20000,
    "login",
  );
  const loginJson = await loginRes.json();
  if (!loginJson.success) {
    throw new Error(`login failed: ${JSON.stringify(loginJson.error)}`);
  }
  const token = loginJson.data.accessToken;
  console.log("login ok", loginJson.data.user.role);

  const createRes = await withTimeout(
    fetch(`${API}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Bouton Nouveau post — OK",
        body: "Contenu assez long pour valider la creation depuis le bouton Nouveau post entreprise.",
        category: "COMPANY_ANNOUNCEMENT",
        tags: ["nouveau-post"],
        language: "FR",
        source: "MANUAL",
        publish: true,
        postKind: "TEXT",
        visibility: "PUBLIC",
        commentMode: "ANYONE",
      }),
    }),
    45000,
    "create post",
  );
  const createJson = await createRes.json();
  if (!createJson.success) {
    throw new Error(`create failed ${createRes.status}: ${JSON.stringify(createJson.error)}`);
  }

  const id = createJson.data.post.id;
  const row = await prisma.post.findUnique({ where: { id } });
  await prisma.$disconnect();

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiStatus: createRes.status,
        postId: id,
        dbStatus: row?.status ?? null,
        inSupabase: Boolean(row),
        url: `http://localhost:3000/posts/${id}`,
        form: "http://localhost:3000/posts/new",
      },
      null,
      2,
    ),
  );
}

main().catch(async (err) => {
  console.error("FAIL", err.message);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
