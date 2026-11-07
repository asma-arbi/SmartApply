-- SmartApply Tunisia — Posts Management only
-- No users / companies / jobs tables. Auth IDs are stored as UUIDs on posts.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- posts module ----------

DO $$ BEGIN
  CREATE TYPE "PostCategory" AS ENUM (
    'COMPANY_ANNOUNCEMENT',
    'CAREER_ADVICE',
    'RECRUITMENT_NEWS',
    'INTERNSHIP_ANNOUNCEMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostSource" AS ENUM ('MANUAL', 'IMPORTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentLanguage" AS ENUM ('FR', 'EN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSE', 'MISINFORMATION', 'COPYRIGHT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'DISMISSED', 'ACTIONED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationAction" AS ENUM ('UNPUBLISH', 'REMOVE', 'RESTORE', 'DISMISS_REPORTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid,
  job_id       uuid,
  author_id    uuid NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  excerpt      text,
  category     "PostCategory" NOT NULL,
  status       "PostStatus" NOT NULL DEFAULT 'DRAFT',
  source       "PostSource" NOT NULL DEFAULT 'MANUAL',
  source_url   text,
  source_name  text,
  language     "ContentLanguage" NOT NULL DEFAULT 'FR',
  published_at timestamptz,
  archived_at  timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_imported_source_chk CHECK (
    source <> 'IMPORTED' OR (source_url IS NOT NULL AND length(trim(source_url)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS posts_status_published_idx ON posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS posts_company_status_idx ON posts (company_id, status);
CREATE INDEX IF NOT EXISTS posts_category_status_idx ON posts (category, status);
CREATE INDEX IF NOT EXISTS posts_job_id_idx ON posts (job_id);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts (author_id);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  tag     text NOT NULL,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX IF NOT EXISTS post_tags_tag_idx ON post_tags (tag);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes (user_id);

CREATE TABLE IF NOT EXISTS post_bookmarks (
  post_id    uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_bookmarks_user_id_idx ON post_bookmarks (user_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  parent_id  uuid REFERENCES post_comments (id) ON DELETE CASCADE,
  body       text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post_created_idx ON post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments (user_id);

CREATE TABLE IF NOT EXISTS post_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  reporter_id    uuid NOT NULL,
  reason         "ReportReason" NOT NULL,
  details        text,
  status         "ReportStatus" NOT NULL DEFAULT 'PENDING',
  reviewed_by_id uuid,
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_reports_status_created_idx ON post_reports (status, created_at);
CREATE INDEX IF NOT EXISTS post_reports_post_status_idx ON post_reports (post_id, status);
CREATE INDEX IF NOT EXISTS post_reports_reporter_post_idx ON post_reports (reporter_id, post_id);

CREATE UNIQUE INDEX IF NOT EXISTS post_reports_one_pending_per_user
  ON post_reports (reporter_id, post_id)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS post_moderation_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  admin_id   uuid NOT NULL,
  action     "ModerationAction" NOT NULL,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_moderation_logs_post_idx ON post_moderation_logs (post_id, created_at);

-- ---------- RLS (service_role bypasses; anon/authenticated can read published) ----------

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_public_read ON posts;
CREATE POLICY posts_public_read ON posts
  FOR SELECT
  USING (status = 'PUBLISHED' AND deleted_at IS NULL);

DROP POLICY IF EXISTS post_tags_public_read ON post_tags;
CREATE POLICY post_tags_public_read ON post_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_tags.post_id
        AND p.status = 'PUBLISHED'
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS post_comments_public_read ON post_comments;
CREATE POLICY post_comments_public_read ON post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_comments.post_id
        AND p.status = 'PUBLISHED'
        AND p.deleted_at IS NULL
    )
  );
