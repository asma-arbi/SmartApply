/**
 * Script de seed MongoDB pour SmartApply
 * Usage: node scripts/seed-mongo.mjs
 *
 * Crée des données de test dans la base "smartapply"
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartapply";

await mongoose.connect(MONGODB_URI);
console.log("✅ Connecté à MongoDB :", MONGODB_URI);

const db = mongoose.connection.db;

// --- Nettoyage ---
const collections = ["posts", "companies", "jobs", "candidate_profiles", "applications", "post_likes", "post_bookmarks", "post_comments", "post_hides", "post_reports", "network_follows", "network_connections", "application_letters", "letter_usage_events"];
for (const col of collections) {
  try { await db.collection(col).deleteMany({}); } catch {}
}
console.log("🗑️  Collections nettoyées");

// --- Entreprises ---
const companyId = new mongoose.Types.ObjectId().toHexString();
await db.collection("companies").insertOne({
  _id: companyId,
  name: "ISELM Tech",
  city: "Tunis",
  sector: "Informatique",
  logoUrl: null,
  isClaimed: true,
  isVerified: true,
  recruiterEmail: "rh@iselm.tn",
  ownerEmail: "rh@iselm.tn",
  createdAt: new Date(),
  updatedAt: new Date(),
});
console.log("🏢 Entreprise créée : ISELM Tech");

// --- Jobs ---
const jobId = new mongoose.Types.ObjectId().toHexString();
await db.collection("jobs").insertOne({
  _id: jobId,
  companyId,
  title: "Développeur Full Stack",
  city: "Tunis",
  type: "CDI",
  language: "FR",
  status: "PUBLISHED",
  description: "Rejoignez notre équipe pour développer des applications web modernes avec Next.js et Node.js.",
  requirements: ["Next.js", "TypeScript", "MongoDB", "3+ ans d'expérience"],
  createdAt: new Date(),
  updatedAt: new Date(),
});
console.log("💼 Offre d'emploi créée : Développeur Full Stack");

// --- Profil Candidat ---
await db.collection("candidate_profiles").insertOne({
  _id: new mongoose.Types.ObjectId().toHexString(),
  email: "candidat@test.tn",
  fullName: "Ahmed Ben Ali",
  city: "Tunis",
  headline: "Développeur Web Junior",
  avatarUrl: null,
  skills: ["JavaScript", "React", "Node.js", "MongoDB"],
  education: ["Licence Informatique - ISELM 2024"],
  experiences: [{ title: "Stagiaire Dev", company: "StartupTN", years: "2023-2024" }],
  languages: [{ name: "Arabe", level: "Natif" }, { name: "Français", level: "Courant" }],
  createdAt: new Date(),
  updatedAt: new Date(),
});
console.log("👤 Profil candidat créé");

// --- Posts ---
const authorId = "00000000-0000-0000-0000-000000000001"; // ID Supabase fictif

const posts = [
  {
    _id: new mongoose.Types.ObjectId().toHexString(),
    authorId,
    companyId,
    jobId: null,
    title: "🚀 ISELM Tech recrute !",
    body: "Nous sommes à la recherche de talents passionnés par le développement web. Rejoignez notre équipe dynamique !",
    excerpt: "Nous recrutons des développeurs web passionnés.",
    category: "COMPANY_ANNOUNCEMENT",
    language: "FR",
    source: "MANUAL",
    sourceUrl: null,
    sourceName: null,
    status: "PUBLISHED",
    postKind: "TEXT",
    visibility: "PUBLIC",
    commentMode: "ANYONE",
    media: [],
    poll: null,
    event: null,
    celebration: null,
    tags: [{ tag: "recrutement" }, { tag: "tech" }, { tag: "iselm" }],
    publishedAt: new Date(),
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new mongoose.Types.ObjectId().toHexString(),
    authorId,
    companyId,
    jobId,
    title: "Offre d'emploi : Développeur Full Stack CDI",
    body: "Nous offrons un poste de Développeur Full Stack à Tunis. Stack : Next.js, TypeScript, MongoDB. Envoyez votre CV à rh@iselm.tn",
    excerpt: "Poste de Développeur Full Stack disponible à Tunis.",
    category: "JOB_OPENING",
    language: "FR",
    source: "MANUAL",
    sourceUrl: null,
    sourceName: null,
    status: "PUBLISHED",
    postKind: "JOB",
    visibility: "PUBLIC",
    commentMode: "ANYONE",
    media: [],
    poll: null,
    event: null,
    celebration: null,
    tags: [{ tag: "emploi" }, { tag: "fullstack" }, { tag: "tunis" }],
    publishedAt: new Date(Date.now() - 3600000),
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    _id: new mongoose.Types.ObjectId().toHexString(),
    authorId,
    companyId: null,
    jobId: null,
    title: "Conseils pour réussir son entretien tech",
    body: "5 conseils pour réussir votre entretien technique :\n1. Préparez vos algorithmes de base\n2. Entraînez-vous sur LeetCode\n3. Préparez des questions sur l'entreprise\n4. Montrez votre code sur GitHub\n5. Soyez curieux et posez des questions !",
    excerpt: "5 conseils essentiels pour réussir un entretien technique.",
    category: "CAREER_ADVICE",
    language: "FR",
    source: "MANUAL",
    sourceUrl: null,
    sourceName: null,
    status: "PUBLISHED",
    postKind: "TEXT",
    visibility: "PUBLIC",
    commentMode: "ANYONE",
    media: [],
    poll: null,
    event: null,
    celebration: null,
    tags: [{ tag: "conseil" }, { tag: "entretien" }, { tag: "carriere" }],
    publishedAt: new Date(Date.now() - 7200000),
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7200000),
  },
];

await db.collection("posts").insertMany(posts);
console.log(`📝 ${posts.length} posts créés`);

// --- Index ---
await db.collection("posts").createIndex({ status: 1, publishedAt: -1 });
await db.collection("posts").createIndex({ authorId: 1 });
await db.collection("post_likes").createIndex({ postId: 1, userId: 1 }, { unique: true });
await db.collection("post_bookmarks").createIndex({ postId: 1, userId: 1 }, { unique: true });
await db.collection("post_comments").createIndex({ postId: 1, parentId: 1 });
await db.collection("candidate_profiles").createIndex({ email: 1 }, { unique: true });
await db.collection("companies").createIndex({ isVerified: 1 });
console.log("📊 Index créés");

await mongoose.disconnect();
console.log("\n✅ Seed terminé ! La base 'smartapply' est maintenant visible dans MongoDB Compass.");
console.log("   Collections créées : posts, companies, jobs, candidate_profiles");
