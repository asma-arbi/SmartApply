/**
 * Wipe SmartApply app tables in Supabase, then seed fresh dynamic entities.
 *
 *   node scripts/reset-and-seed.mjs
 *
 * Demo logins (password TestPosts123!):
 *   candidate.posts@smartapply.tn
 *   company.posts@smartapply.tn
 *   admin.posts@smartapply.tn
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
const PASSWORD = process.env.SEED_PASSWORD || "TestPosts123!";

if (!dbUrl || !supabaseUrl || !serviceKey) {
  console.error("Missing DATABASE_URL/DIRECT_URL or Supabase env.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  {
    email: "candidate.posts@smartapply.tn",
    role: "CANDIDATE",
    plan: "FREE",
    full_name: "Amine Ben Salah",
  },
  {
    email: "company.posts@smartapply.tn",
    role: "COMPANY",
    plan: "FREE",
    full_name: "Nexa Recrutement",
  },
  {
    email: "admin.posts@smartapply.tn",
    role: "ADMIN",
    plan: "PREMIUM",
    full_name: "Admin SmartApply",
  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function listAllUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function ensureUser({ email, role, plan, full_name }) {
  const existing = (await listAllUsers()).find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata ?? {}), role, plan },
      user_metadata: { ...(existing.user_metadata ?? {}), full_name, name: full_name },
    });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role, plan },
    user_metadata: { full_name, name: full_name },
  });
  if (error) throw error;
  return data.user;
}

async function ensureSchemaExtras() {
  // Additive enums / columns already used by Prisma (safe if already applied).
  const statements = [
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'JOB_OPENING'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'PFE_ANNOUNCEMENT'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'OPEN_DAY'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'WORKSHOP'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'COMPANY_LIFE'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'TESTIMONIAL'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'SCHOLARSHIP'`,
    `ALTER TYPE "PostCategory" ADD VALUE IF NOT EXISTS 'CAMPUS_NEWS'`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* already exists or older PG without IF NOT EXISTS — ignore */
    }
  }
}

async function wipe() {
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
      "posts",
      "application_letters",
      "letter_usage_events",
      "catalog_applications",
      "candidate_profiles",
      "catalog_jobs",
      "catalog_companies"
    RESTART IDENTITY CASCADE
  `);
}

async function seed(users) {
  const candidate = users.find((u) => u.email === "candidate.posts@smartapply.tn");
  const companyUser = users.find((u) => u.email === "company.posts@smartapply.tn");
  const adminUser = users.find((u) => u.email === "admin.posts@smartapply.tn");
  if (!candidate || !companyUser || !adminUser) {
    throw new Error("Demo auth users missing after ensure.");
  }

  const nexa = await prisma.company.create({
    data: {
      name: "Nexa Digital Tunisie",
      city: "Ariana",
      sector: "Services numériques",
      isClaimed: true,
      isVerified: true,
      recruiterEmail: companyUser.email,
      ownerEmail: companyUser.email,
    },
  });

  const vermeg = await prisma.company.create({
    data: {
      name: "Vermeg Tunisia",
      city: "Tunis",
      sector: "Fintech",
      isClaimed: true,
      isVerified: true,
      recruiterEmail: "careers@vermeg.tn",
      ownerEmail: null,
    },
  });

  const instadeep = await prisma.company.create({
    data: {
      name: "InstaDeep Tunis",
      city: "Tunis",
      sector: "IA / Research",
      isClaimed: false,
      isVerified: true,
      recruiterEmail: "jobs@instadeep.tn",
      ownerEmail: null,
    },
  });

  const jobFlutter = await prisma.job.create({
    data: {
      companyId: nexa.id,
      title: "Stagiaire développeur Flutter (PFE)",
      city: "Ariana",
      type: "PFE",
      language: "FR",
      status: "PUBLISHED",
      description:
        "Stage PFE Flutter 6 mois. Stack Dart/Flutter, API REST, Git. Encadrement par un tuteur Nexa.",
      requirements: ["Flutter", "Dart", "Git", "API REST"],
    },
  });

  const jobFullstack = await prisma.job.create({
    data: {
      companyId: vermeg.id,
      title: "Développeur fullstack junior",
      city: "Tunis",
      type: "CDI",
      language: "FR",
      status: "PUBLISHED",
      description:
        "CDI junior TypeScript / React / Nest. Participation au delivery produits bancaires.",
      requirements: ["TypeScript", "React", "SQL"],
    },
  });

  const jobMl = await prisma.job.create({
    data: {
      companyId: instadeep.id,
      title: "Stage Machine Learning",
      city: "Tunis",
      type: "STAGE",
      language: "EN",
      status: "PUBLISHED",
      description: "3–6 month ML internship. Python, PyTorch, experimentation culture.",
      requirements: ["Python", "PyTorch", "English"],
    },
  });

  await prisma.candidateProfile.create({
    data: {
      email: candidate.email,
      fullName: "Amine Ben Salah",
      city: "Tunis",
      headline: "Étudiant ingénieur logiciel — PFE 2026",
      skills: ["TypeScript", "React", "Flutter", "SQL", "Git"],
      education: ["Licence informatique — ISI Ariana"],
      experiences: [
        { title: "Stagiaire développement", company: "Startup Hub Tunis", years: "2025" },
      ],
      languages: [
        { name: "Français", level: "courant" },
        { name: "Anglais", level: "intermédiaire" },
        { name: "Arabe", level: "natif" },
      ],
    },
  });

  const app1 = await prisma.application.create({
    data: {
      jobId: jobFlutter.id,
      ownerEmail: candidate.email,
      status: "SUBMITTED",
    },
  });
  const app2 = await prisma.application.create({
    data: {
      jobId: jobFullstack.id,
      ownerEmail: candidate.email,
      status: "DRAFT",
    },
  });

  const closes = new Date();
  closes.setDate(closes.getDate() + 7);

  const jobPost = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: nexa.id,
      jobId: jobFlutter.id,
      title: "4 places de stage PFE — été 2027",
      body: "Nexa Digital ouvre 4 stages PFE (.NET, Flutter, data, QA). Candidatures jusqu’au 30 novembre. Lien offre SmartApply disponible.",
      excerpt: "4 stages PFE Nexa",
      category: "INTERNSHIP_ANNOUNCEMENT",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(0),
      postKind: "JOB",
      tags: { create: ["stage", "pfe", "flutter", "ariana"].map((tag) => ({ tag })) },
    },
  });

  const announcement = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: nexa.id,
      title: "Portes ouvertes campus Ariana",
      body: "Rencontrez les équipes produit et recrutement samedi prochain. Ateliers CV + démo produits.",
      excerpt: "Portes ouvertes Nexa",
      category: "OPEN_DAY",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(1),
      postKind: "TEXT",
      tags: { create: ["campus", "tunisie", "recrutement"].map((tag) => ({ tag })) },
    },
  });

  const advice = await prisma.post.create({
    data: {
      authorId: candidate.id,
      title: "Guide : lettre de motivation de stage",
      body: "Personnalisez sujet + corps avec des faits de votre profil. Pas d’invention d’employeur ni de diplôme.",
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
          name: "Guide lettre de motivation",
        },
      ],
      tags: { create: ["lettre", "conseils", "stage"].map((tag) => ({ tag })) },
    },
  });

  const poll = await prisma.post.create({
    data: {
      authorId: candidate.id,
      title: "Quel est votre plus grand frein pour un stage PFE ?",
      body: "Votez — on partagera les résultats la semaine prochaine.",
      excerpt: "Sondage PFE",
      category: "CAREER_ADVICE",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(3),
      postKind: "POLL",
      poll: {
        options: [
          "Trouver les bonnes offres",
          "Écrire la lettre",
          "Préparer l’entretien",
        ],
        closesAt: closes.toISOString(),
      },
      tags: { create: ["sondage", "pfe"].map((tag) => ({ tag })) },
    },
  });

  const vermegPost = await prisma.post.create({
    data: {
      authorId: companyUser.id,
      companyId: vermeg.id,
      jobId: jobFullstack.id,
      title: "Vermeg recrute un fullstack junior",
      body: "CDI Tunis — TypeScript, React, SQL. Post lié à l’offre catalogue (pas une offre isolée).",
      excerpt: "Offre Vermeg junior",
      category: "JOB_OPENING",
      status: "PUBLISHED",
      source: "MANUAL",
      publishedAt: daysAgo(4),
      postKind: "JOB",
      tags: { create: ["cdi", "typescript", "tunis"].map((tag) => ({ tag })) },
    },
  });

  await prisma.postComment.createMany({
    data: [
      {
        postId: advice.id,
        userId: companyUser.id,
        body: "Bon rappel sur l’ancrage anti-invention — on le voit trop souvent.",
      },
      {
        postId: jobPost.id,
        userId: candidate.id,
        body: "Intéressé par le slot Flutter, candidature envoyée.",
      },
      {
        postId: announcement.id,
        userId: adminUser.id,
        body: "Annonce validée côté modération.",
      },
    ],
  });

  await prisma.postLike.createMany({
    data: [
      { postId: jobPost.id, userId: candidate.id, type: "LIKE" },
      { postId: advice.id, userId: companyUser.id, type: "INSIGHTFUL" },
      { postId: vermegPost.id, userId: candidate.id, type: "CELEBRATE" },
      { postId: poll.id, userId: companyUser.id, type: "LIKE" },
    ],
  });

  await prisma.postBookmark.create({
    data: { postId: jobPost.id, userId: candidate.id },
  });

  await prisma.postPollVote.createMany({
    data: [
      { postId: poll.id, userId: candidate.id, optionIndex: 0 },
      { postId: poll.id, userId: companyUser.id, optionIndex: 1 },
    ],
  });

  return {
    companies: [nexa.name, vermeg.name, instadeep.name],
    jobs: [jobFlutter.title, jobFullstack.title, jobMl.title],
    applications: [app1.id, app2.id],
    posts: 5,
    logins: {
      candidate: candidate.email,
      company: companyUser.email,
      admin: adminUser.email,
      password: PASSWORD,
    },
  };
}

async function main() {
  console.log("1/4 Ensuring demo Auth users…");
  const ensured = [];
  for (const demo of DEMO_USERS) {
    const user = await ensureUser(demo);
    ensured.push({ id: user.id, email: demo.email, role: demo.role });
    console.log("  ·", demo.email, user.id);
  }

  console.log("2/4 Ensuring category enums…");
  await ensureSchemaExtras();

  console.log("3/4 Wiping app tables…");
  await wipe();

  console.log("4/4 Seeding dynamic catalog + posts…");
  const summary = await seed(
    ensured.map((u) => ({ id: u.id, email: u.email })),
  );

  const counts = {
    companies: await prisma.company.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.application.count(),
    profiles: await prisma.candidateProfile.count(),
    posts: await prisma.post.count(),
    comments: await prisma.postComment.count(),
    likes: await prisma.postLike.count(),
  };

  console.log(JSON.stringify({ ok: true, ...summary, counts }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
