/**
 * Optional demo posts. Run only if you want sample rows:
 *   node scripts/seed-posts-demo.mjs
 * The live catalog stays empty until this script is executed.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const authorId = process.env.SEED_AUTHOR_ID;

const samples = [
  {
    title: "Portes ouvertes — printemps",
    body: "<p>Rencontrez les équipes recrutement et les stagiaires.</p>",
    category: "COMPANY_ANNOUNCEMENT",
    tags: ["tunis", "campus"],
  },
  {
    title: "Comment préparer un entretien PFE",
    body: "<p>Préparez un projet, un chiffre et une question pour l’équipe.</p>",
    category: "CAREER_ADVICE",
    tags: ["pfe", "entretien"],
  },
  {
    title: "Calendrier de recrutement 2026",
    body: "<p>Les candidatures de stage ouvrent en février.</p>",
    category: "RECRUITMENT_NEWS",
    tags: ["recrutement"],
  },
  {
    title: "Stage développement web",
    body: "<p>Stage de 4 à 6 mois, encadré par un tuteur.</p><p>Source : <a href=\"https://smartapply.tn\">smartapply.tn</a></p>",
    category: "INTERNSHIP_ANNOUNCEMENT",
    tags: ["stage", "web"],
    source: "IMPORTED",
    sourceUrl: "https://smartapply.tn",
    sourceName: "smartapply.tn",
  },
];

if (!authorId) {
  console.error("Définissez SEED_AUTHOR_ID avec l’id du compte auteur, puis relancez.");
  process.exit(1);
}

for (const sample of samples) {
  await prisma.post.create({
    data: {
      authorId,
      title: sample.title,
      body: sample.body,
      excerpt: sample.title,
      category: sample.category,
      status: "PUBLISHED",
      source: sample.source ?? "MANUAL",
      sourceUrl: sample.sourceUrl ?? null,
      sourceName: sample.sourceName ?? null,
      publishedAt: new Date(),
      postKind: "ARTICLE",
      tags: { create: sample.tags.map((tag) => ({ tag })) },
    },
  });
  console.log("created", sample.title);
}

await prisma.$disconnect();
