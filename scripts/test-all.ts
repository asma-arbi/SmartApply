import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    if (process.env[trimmed.slice(0, eq)]) continue;
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[trimmed.slice(0, eq)] = value;
  }
}

loadEnv();

const BASE = "http://localhost:3000";
const results: { name: string; ok: boolean; detail: string }[] = [];

async function login(email: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "TestPosts123!" });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
}

async function req(name: string, method: string, path: string, token?: string, body?: unknown, expect = 200) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const ok = res.status === expect && json?.success !== false;
  results.push({
    name,
    ok,
    detail: ok ? `${res.status}` : `${res.status} ${JSON.stringify(json.error ?? json).slice(0, 180)}`,
  });
  if (!ok) return { res, json, failed: true };
  return { res, json, failed: false };
}

async function main() {
  const health = await req("GET /api", "GET", "/api");
  if (health.failed) throw new Error("API not running on :3000");

  const company = await login("company.posts@smartapply.tn");
  const candidate = await login("candidate.posts@smartapply.tn");
  const admin = await login("admin.posts@smartapply.tn");

  await req("GET /api/v1/posts (public)", "GET", "/api/v1/posts");
  await req("GET /api/docs", "GET", "/api/docs");
  await req("GET /api/docs/swagger.json", "GET", "/api/docs/swagger.json");

  const created = await req(
    "POST /api/v1/posts (create+persist)",
    "POST",
    "/api/v1/posts",
    company,
    {
      title: "Test complet backend",
      body: "Post de verification complete: create, like, comment, report, admin.",
      category: "RECRUITMENT_NEWS",
      tags: ["test", "live"],
    },
    201,
  );
  const postId = created.json?.data?.post?.id as string | undefined;
  if (!postId) throw new Error("create did not return post id");

  await req("GET /api/v1/posts/:id", "GET", `/api/v1/posts/${postId}`);
  await req(
    "PATCH /api/v1/posts/:id",
    "PATCH",
    `/api/v1/posts/${postId}`,
    company,
    { title: "Test complet backend (maj)" },
  );
  await req("GET /api/v1/company/posts", "GET", "/api/v1/company/posts", company);
  await req("POST /api/v1/posts/:id/like", "POST", `/api/v1/posts/${postId}/like`, candidate);
  await req("POST /api/v1/posts/:id/bookmark", "POST", `/api/v1/posts/${postId}/bookmark`, candidate);
  await req("GET /api/v1/me/bookmarks", "GET", "/api/v1/me/bookmarks", candidate);
  const comment = await req(
    "POST /api/v1/posts/:id/comments",
    "POST",
    `/api/v1/posts/${postId}/comments`,
    candidate,
    { body: "Commentaire de test" },
    201,
  );
  const commentId = comment.json?.data?.comment?.id as string | undefined;
  await req("GET /api/v1/posts/:id/comments", "GET", `/api/v1/posts/${postId}/comments`);
  if (commentId) {
    await req(
      "PATCH /api/v1/comments/:id",
      "PATCH",
      `/api/v1/comments/${commentId}`,
      candidate,
      { body: "Commentaire modifie" },
    );
  }
  await req(
    "POST /api/v1/posts/:id/report",
    "POST",
    `/api/v1/posts/${postId}/report`,
    candidate,
    { reason: "SPAM", details: "test signalement" },
    201,
  );
  await req("GET /api/v1/admin/posts/reports", "GET", "/api/v1/admin/posts/reports", admin);
  await req(
    "POST /api/v1/admin/posts/:id/moderate",
    "POST",
    `/api/v1/admin/posts/${postId}/moderate`,
    admin,
    { action: "RESTORE", reason: "Test moderation restore" },
  );
  await req("POST /api/v1/posts/:id/archive", "POST", `/api/v1/posts/${postId}/archive`, company);
  await req("POST /api/v1/posts/:id/publish", "POST", `/api/v1/posts/${postId}/publish`, company);
  await req("DELETE /api/v1/posts/:id", "DELETE", `/api/v1/posts/${postId}`, company);

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "OK " : "FAIL"}  ${r.name}  ${r.detail}`);
  }
  console.log("");
  console.log(failed.length === 0 ? `ALL_OK ${results.length}/${results.length}` : `FAILED ${failed.length}/${results.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
