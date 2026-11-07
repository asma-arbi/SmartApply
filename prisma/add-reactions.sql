DO $$ BEGIN
  CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'SUPPORT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "post_likes" ADD COLUMN IF NOT EXISTS "type" "ReactionType" NOT NULL DEFAULT 'LIKE';

CREATE INDEX IF NOT EXISTS "post_likes_post_id_type_idx" ON "post_likes" ("post_id", "type");
