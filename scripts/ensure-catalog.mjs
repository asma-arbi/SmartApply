/**
 * Create missing catalog_* tables and seed the demo company (no wipe).
 *   node scripts/ensure-catalog.mjs
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

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const statements = [
  `DO $$ BEGIN CREATE TYPE "JobType" AS ENUM ('CDI', 'STAGE', 'PFE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS catalog_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    city text NOT NULL,
    sector text NOT NULL,
    is_claimed boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,
    recruiter_email text NOT NULL,
    owner_email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS catalog_companies_owner_email_idx ON catalog_companies (owner_email)`,
  `CREATE INDEX IF NOT EXISTS catalog_companies_name_idx ON catalog_companies (name)`,
  `CREATE TABLE IF NOT EXISTS catalog_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES catalog_companies (id) ON DELETE CASCADE,
    title text NOT NULL,
    city text NOT NULL,
    type "JobType" NOT NULL,
    language "ContentLanguage" NOT NULL DEFAULT 'FR',
    status "JobStatus" NOT NULL DEFAULT 'DRAFT',
    description text NOT NULL,
    requirements text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS catalog_jobs_company_status_idx ON catalog_jobs (company_id, status)`,
  `CREATE INDEX IF NOT EXISTS catalog_jobs_title_idx ON catalog_jobs (title)`,
  `CREATE TABLE IF NOT EXISTS catalog_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES catalog_jobs (id) ON DELETE CASCADE,
    owner_email text NOT NULL,
    status "ApplicationStatus" NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS catalog_applications_owner_email_idx ON catalog_applications (owner_email)`,
  `CREATE INDEX IF NOT EXISTS catalog_applications_job_id_idx ON catalog_applications (job_id)`,
  `CREATE TABLE IF NOT EXISTS candidate_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    city text NOT NULL,
    headline text NOT NULL,
    skills text[] NOT NULL DEFAULT '{}',
    education text[] NOT NULL DEFAULT '{}',
    experiences jsonb NOT NULL DEFAULT '[]',
    languages jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
];

const email = "company.posts@smartapply.tn";

for (const sql of statements) {
  await prisma.$executeRawUnsafe(sql);
}

const existing = await prisma.company.findFirst({
  where: { OR: [{ ownerEmail: email }, { recruiterEmail: email }] },
});

const company =
  existing ??
  (await prisma.company.create({
    data: {
      name: "Nexa Digital Tunisie",
      city: "Ariana",
      sector: "Services numériques",
      isClaimed: true,
      isVerified: true,
      recruiterEmail: email,
      ownerEmail: email,
    },
  }));

console.log("catalog ready", { companyId: company.id, email });
await prisma.$disconnect();
