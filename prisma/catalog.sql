DO $$ BEGIN
  CREATE TYPE "JobType" AS ENUM ('CDI', 'STAGE', 'PFE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "catalog_companies" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "is_claimed" BOOLEAN NOT NULL DEFAULT false,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "recruiter_email" TEXT NOT NULL,
  "owner_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_jobs" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "type" "JobType" NOT NULL,
  "language" "ContentLanguage" NOT NULL DEFAULT 'FR',
  "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT NOT NULL,
  "requirements" TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "candidate_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "skills" TEXT[],
  "education" TEXT[],
  "experiences" JSONB NOT NULL,
  "languages" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_applications" (
  "id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "owner_email" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "candidate_profiles_email_key" ON "candidate_profiles"("email");
CREATE INDEX IF NOT EXISTS "catalog_companies_owner_email_idx" ON "catalog_companies"("owner_email");
CREATE INDEX IF NOT EXISTS "catalog_companies_name_idx" ON "catalog_companies"("name");
CREATE INDEX IF NOT EXISTS "catalog_jobs_company_id_status_idx" ON "catalog_jobs"("company_id", "status");
CREATE INDEX IF NOT EXISTS "catalog_jobs_title_idx" ON "catalog_jobs"("title");
CREATE INDEX IF NOT EXISTS "catalog_applications_owner_email_idx" ON "catalog_applications"("owner_email");
CREATE INDEX IF NOT EXISTS "catalog_applications_job_id_idx" ON "catalog_applications"("job_id");

DO $$ BEGIN
  ALTER TABLE "catalog_jobs"
    ADD CONSTRAINT "catalog_jobs_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "catalog_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "catalog_applications"
    ADD CONSTRAINT "catalog_applications_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "catalog_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
