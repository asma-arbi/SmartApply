-- Application Content Studio — letters only. application_id is Yosra's UUID.

DO $$ BEGIN
  CREATE TYPE "LetterSource" AS ENUM ('AI', 'TEMPLATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LetterStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LetterUsageKind" AS ENUM ('GENERATE', 'SEND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS application_letters (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  user_id        uuid NOT NULL,
  job_id         uuid NOT NULL,
  language       "ContentLanguage" NOT NULL,
  subject        text NOT NULL,
  body           text NOT NULL,
  source         "LetterSource" NOT NULL,
  status         "LetterStatus" NOT NULL DEFAULT 'DRAFT',
  warnings       text[] NOT NULL DEFAULT ARRAY[]::text[],
  recipient      text,
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_letters_user_created_idx
  ON application_letters (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS application_letters_application_idx
  ON application_letters (application_id);

CREATE TABLE IF NOT EXISTS letter_usage_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  kind       "LetterUsageKind" NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS letter_usage_events_user_kind_idx
  ON letter_usage_events (user_id, kind, created_at DESC);
