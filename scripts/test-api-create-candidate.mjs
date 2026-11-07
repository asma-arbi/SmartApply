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

const login = await (
  await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "candidate.posts@smartapply.tn",
      password: "TestPosts123!",
    }),
  })
).json();
if (!login.success) throw new Error(JSON.stringify(login.error));

const create = await (
  await fetch(`${API}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${login.data.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Post candidat OK",
      body: "Conseil partage par un candidat pour verifier la creation depuis le formulaire.",
      category: "CAREER_ADVICE",
      tags: ["candidat"],
      language: "FR",
      source: "MANUAL",
      publish: true,
      postKind: "TEXT",
    }),
  })
).json();

console.log(
  JSON.stringify(
    {
      ok: create.success,
      role: "CANDIDATE",
      postId: create.data?.post?.id,
      status: create.data?.post?.status,
      error: create.error ?? null,
    },
    null,
    2,
  ),
);
if (!create.success) process.exit(1);
