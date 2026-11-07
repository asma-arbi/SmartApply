const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const results = [];

async function login(email) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "TestPosts123!" }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login ${email}: ${json.error?.message}`);
  return { token: json.data.accessToken, user: json.data.user };
}

async function api(name, path, { method = "GET", token, body, expect = 200 } = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const ok = res.status === expect && json.success !== false;
  results.push({ name, ok, detail: `${res.status}` });
  if (!ok) throw new Error(`${name}: ${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json.data;
}

async function main() {
  const pages = ["/", "/login", "/company/new", "/saved"];
  for (const path of pages) {
    const res = await fetch(`http://localhost:3000${path}`);
    results.push({ name: `FRONT ${path}`, ok: res.status === 200, detail: `${res.status}` });
  }

  const company = await login("company.posts@smartapply.tn");
  const candidate = await login("candidate.posts@smartapply.tn");
  const admin = await login("admin.posts@smartapply.tn");

  const created = await api("create post", "/posts", {
    method: "POST",
    token: company.token,
    body: {
      title: "E2E front SmartApply",
      body: "Contenu assez long pour passer la validation backend et aller dans Supabase.",
      category: "INTERNSHIP_ANNOUNCEMENT",
      tags: ["e2e", "front"],
      language: "FR",
      source: "MANUAL",
      publish: true,
    },
    expect: 201,
  });
  const id = created.post.id;

  await api("read post", `/posts/${id}`, { token: candidate.token });
  await api("like", `/posts/${id}/like`, { method: "POST", token: candidate.token });
  await api("bookmark", `/posts/${id}/bookmark`, { method: "POST", token: candidate.token });
  const comment = await api("comment", `/posts/${id}/comments`, {
    method: "POST",
    token: candidate.token,
    body: { body: "Premier commentaire E2E" },
    expect: 201,
  });
  await api("reply", `/posts/${id}/comments`, {
    method: "POST",
    token: company.token,
    body: { body: "Réponse E2E", parentId: comment.comment.id },
    expect: 201,
  });
  await api("comment like", `/comments/${comment.comment.id}/like`, {
    method: "POST",
    token: company.token,
    body: { type: "LOVE" },
  });
  await api("edit comment", `/comments/${comment.comment.id}`, {
    method: "PATCH",
    token: candidate.token,
    body: { body: "Commentaire modifié E2E" },
  });
  await api("report", `/posts/${id}/report`, {
    method: "POST",
    token: candidate.token,
    body: { reason: "SPAM", details: "test e2e" },
    expect: 201,
  });
  await api("archive", `/posts/${id}/archive`, { method: "POST", token: company.token });
  await api("publish", `/posts/${id}/publish`, { method: "POST", token: company.token });
  await api("admin reports", "/admin/posts/reports?status=PENDING", { token: admin.token });
  await api("search", "/posts?q=E2E&category=INTERNSHIP_ANNOUNCEMENT");
  await api("bookmarks list", "/me/bookmarks", { token: candidate.token });
  await api("delete", `/posts/${id}`, { method: "DELETE", token: company.token });

  const failed = results.filter((item) => !item.ok);
  console.log(results.map((item) => `${item.ok ? "OK" : "KO"} ${item.name} ${item.detail}`).join("\n"));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  console.log(results.map((item) => `${item.ok ? "OK" : "KO"} ${item.name} ${item.detail}`).join("\n"));
  process.exit(1);
});
