/**
 * Posts only — wipe + seed Supabase tables for the Posts Management module.
 *
 *   npm run db:reset-posts
 *
 * Touches: posts, tags, likes, comments, bookmarks, reports, polls, hides, moderation.
 * Does NOT touch catalog / letters / Auth users (except reading demo accounts).
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dbUrl || !supabaseUrl || !serviceKey) {
  console.error("Missing DATABASE_URL/DIRECT_URL or Supabase env.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function findUser(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function wipePostsOnly() {
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
}

async function main() {
  const companyUser =
    (await findUser("company.posts@smartapply.tn")) ??
    (await findUser("company@smartapply.tn"));
  const candidateUser =
    (await findUser("candidate.posts@smartapply.tn")) ??
    (await findUser("candidate@smartapply.tn"));
  const adminUser = await findUser("admin.posts@smartapply.tn");

  if (!companyUser || !candidateUser) {
    console.error(
      "Comptes Auth requis: company.posts@smartapply.tn et candidate.posts@smartapply.tn",
    );
    process.exit(1);
  }

  // Optional link to catalog if present (dynamic — not invented IDs).
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ ownerEmail: companyUser.email }, { recruiterEmail: companyUser.email }],
    },
    orderBy: { updatedAt: "desc" },
  });
  const job = company
    ? await prisma.job.findFirst({
        where: { companyId: company.id, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  console.log("Wipe posts tables…");
  await wipePostsOnly();

  console.log("Seed posts…");
  const closes = new Date();
  closes.setDate(closes.getDate() + 7);

  const jobPost = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: company?.id ?? null,
      jobId: job?.id ?? null,
      title: "4 places de stage PFE — été 2027",
      body: "Ouverture de 4 stages PFE (.NET, Flutter, data, QA). Candidatures jusqu’au 30 novembre.",
      excerpt: "4 stages PFE",
      category: "INTERNSHIP_ANNOUNCEMENT",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(0),
      postKind: "JOB",
      tags: { create: ["stage", "pfe", "flutter"].map((tag) => ({ tag })) },
    },
  });

  const announcement = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: company?.id ?? null,
      title: "Portes ouvertes campus",
      body: "Rencontrez les équipes produit et recrutement. Ateliers CV + démo produits.",
      excerpt: "Portes ouvertes",
      category: "COMPANY_ANNOUNCEMENT",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(1),
      postKind: "TEXT",
      tags: { create: ["campus", "recrutement"].map((tag) => ({ tag })) },
    },
  });

  const advice = await prisma.post.create({
    data: {
      authorId: candidateUser.id,
      title: "Guide : lettre de motivation de stage",
      body: "Personnalisez avec des faits de votre profil. Aucun employeur inventé.",
      excerpt: "Guide lettre",
      category: "CAREER_ADVICE",
      status: "PUBLISHED",
      source: "IMPORTED",
      sourceUrl: "https://smartapply.tn/blog/lettre-stage",
      sourceName: "smartapply.tn",
      publishedAt: daysAgo(2),
      postKind: "DOCUMENT",
      media: [
        {
          type: "document",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          name: "Guide lettre",
        },
      ],
      tags: { create: ["lettre", "conseils"].map((tag) => ({ tag })) },
    },
  });

  const poll = await prisma.post.create({
    data: {
      authorId: candidateUser.id,
      title: "Quel est votre plus grand frein pour un stage PFE ?",
      body: "Votez — résultats la semaine prochaine.",
      excerpt: "Sondage PFE",
      category: "CAREER_ADVICE",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(3),
      postKind: "POLL",
      poll: {
        options: ["Trouver les offres", "Écrire la lettre", "Préparer l’entretien"],
        closesAt: closes.toISOString(),
      },
      tags: { create: ["sondage", "pfe"].map((tag) => ({ tag })) },
    },
  });

  const news = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: company?.id ?? null,
      title: "Calendrier de recrutement 2026",
      body: "Les candidatures de stage ouvrent en février. Suivez le fil pour les annonces.",
      excerpt: "Calendrier 2026",
      category: "RECRUITMENT_NEWS",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(4),
      postKind: "TEXT",
      tags: { create: ["recrutement", "2026"].map((tag) => ({ tag })) },
    },
  });

  await prisma.postComment.createMany({
    data: [
      {
        postId: advice.id,
        userId: companyUser.id,
        body: "Utile — surtout le point anti-invention.",
      },
      {
        postId: jobPost.id,
        userId: candidateUser.id,
        body: "Intéressé par le slot Flutter.",
      },
      ...(adminUser
        ? [
            {
              postId: announcement.id,
              userId: adminUser.id,
              body: "Annonce OK côté modération.",
            },
          ]
        : []),
    ],
  });

  await prisma.postLike.createMany({
    data: [
      { postId: jobPost.id, userId: candidateUser.id, type: "LIKE" },
      { postId: advice.id, userId: companyUser.id, type: "INSIGHTFUL" },
      { postId: news.id, userId: candidateUser.id, type: "CELEBRATE" },
      { postId: poll.id, userId: companyUser.id, type: "LIKE" },
    ],
  });

  await prisma.postBookmark.create({
    data: { postId: jobPost.id, userId: candidateUser.id },
  });

  await prisma.postPollVote.createMany({
    data: [
      { postId: poll.id, userId: candidateUser.id, optionIndex: 0 },
      { postId: poll.id, userId: companyUser.id, optionIndex: 1 },
    ],
  });

  const counts = {
    posts: await prisma.post.count(),
    comments: await prisma.postComment.count(),
    likes: await prisma.postLike.count(),
    bookmarks: await prisma.postBookmark.count(),
    pollVotes: await prisma.postPollVote.count(),
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        scope: "posts-only",
        linkedCompany: company?.name ?? null,
        linkedJob: job?.title ?? null,
        counts,
        login: {
          candidate: candidateUser.email,
          company: companyUser.email,
          password: "TestPosts123!",
        },
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
