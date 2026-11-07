/**
 * Seed feed matching the LinkedIn-style mockup.
 *   node scripts/seed-feed-mockup.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
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

loadEnv(".env.local");
loadEnv(".env");

const prisma = new PrismaClient();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const admin = createClient(url, service, {
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

async function main() {
  const companyUser =
    (await findUser("company.posts@smartapply.tn")) ??
    (await findUser("company@smartapply.tn"));
  const candidateUser =
    (await findUser("candidate.posts@smartapply.tn")) ??
    (await findUser("amine@smartapply.tn")) ??
    (await findUser("candidate@smartapply.tn"));

  if (!companyUser || !candidateUser) {
    console.error("Comptes introuvables. Attendu: company.posts@smartapply.tn et candidate.posts@smartapply.tn");
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    console.error(
      "Users:",
      data.users.map((u) => u.email),
    );
    process.exit(1);
  }

  let company = await prisma.company.findFirst({
    where: { name: { contains: "Nexa", mode: "insensitive" } },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Nexa Digital Tunisie",
        city: "Ariana, Tunisie",
        sector: "Services numériques",
        isClaimed: true,
        isVerified: true,
        recruiterEmail: companyUser.email ?? "company.posts@smartapply.tn",
        ownerEmail: companyUser.email,
      },
    });
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        name: "Nexa Digital Tunisie",
        city: "Ariana, Tunisie",
        sector: "Services numériques",
        isClaimed: true,
        isVerified: true,
        ownerEmail: companyUser.email,
      },
    });
  }

  let job = await prisma.job.findFirst({
    where: { companyId: company.id, title: { contains: "Flutter", mode: "insensitive" } },
  });
  if (!job) {
    job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: "Stagiaire développeur Flutter (PFE)",
        city: "Ariana, Tunisie",
        type: "PFE",
        status: "PUBLISHED",
        description: "Stage PFE Flutter · 6 mois · Ariana, Tunisie",
        requirements: ["Flutter", "Dart"],
        language: "FR",
      },
    });
  }

  await prisma.post.deleteMany({
    where: {
      OR: [
        { title: { contains: "places de stage PFE" } },
        { title: { contains: "lettre de motivation" } },
        { title: { contains: "frein pour décrocher" } },
      ],
    },
  });

  const closes = new Date();
  closes.setDate(closes.getDate() + 4);

  const jobPost = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: company.id,
      jobId: job.id,
      title: "4 places de stage PFE pour l'été 2027",
      body: "4 places de stage PFE pour l'été 2027 : .NET, Flutter, data et QA. Candidatures jusqu'au 30 novembre.",
      excerpt: "4 places de stage PFE",
      category: "INTERNSHIP_ANNOUNCEMENT",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(0),
      postKind: "JOB",
      visibility: "PUBLIC",
      commentMode: "ANYONE",
      media: [],
      tags: { create: ["stage", "pfe", "flutter", "tunisie"].map((tag) => ({ tag })) },
    },
  });

  const docPost = await prisma.post.create({
    data: {
      authorId: candidateUser.id,
      title: "Guide : lettre de motivation de stage",
      body: "Voici un guide pratique pour personnaliser votre lettre de motivation par entreprise.",
      excerpt: "Guide lettre de motivation",
      category: "CAREER_ADVICE",
      status: "PUBLISHED",
      source: "IMPORTED",
      sourceUrl: "https://blog.exemple.tn",
      sourceName: "blog.exemple.tn",
      publishedAt: daysAgo(1),
      postKind: "DOCUMENT",
      visibility: "PUBLIC",
      commentMode: "ANYONE",
      media: [
        {
          type: "document",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          name: "Guide : lettre de motivation de stage",
        },
      ],
      tags: { create: ["lettredemotivation", "conseils"].map((tag) => ({ tag })) },
    },
  });

  const pollPost = await prisma.post.create({
    data: {
      authorId: candidateUser.id,
      title: "Quel est votre plus grand frein pour décrocher un stage PFE ?",
      body: "Quel est votre plus grand frein pour décrocher un stage PFE ?",
      excerpt: "Sondage PFE",
      category: "CAREER_ADVICE",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(3),
      postKind: "POLL",
      visibility: "PUBLIC",
      commentMode: "ANYONE",
      media: [],
      poll: {
        options: [
          "Trouver les bonnes offres",
          "Écrire la lettre de motivation",
          "Préparer l'entretien",
        ],
        closesAt: closes.toISOString(),
      },
      tags: { create: ["recrutement", "pfe"].map((tag) => ({ tag })) },
    },
  });

  await prisma.postComment.create({
    data: {
      postId: docPost.id,
      userId: candidateUser.id,
      body: "Très utile, surtout le point sur la personnalisation par entreprise.",
    },
  });

  // Likes on job post (unique per user — only one from candidate)
  await prisma.postLike
    .upsert({
      where: { postId_userId: { postId: jobPost.id, userId: candidateUser.id } },
      create: { postId: jobPost.id, userId: candidateUser.id, type: "LIKE" },
      update: { type: "LIKE" },
    })
    .catch(() => undefined);

  for (const [userId, optionIndex] of [
    [candidateUser.id, 0],
    [companyUser.id, 1],
  ]) {
    await prisma.postPollVote
      .upsert({
        where: { postId_userId: { postId: pollPost.id, userId } },
        create: { postId: pollPost.id, userId, optionIndex },
        update: { optionIndex },
      })
      .catch(() => undefined);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        posts: 3,
        company: company.name,
        open: "http://localhost:3000/",
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
