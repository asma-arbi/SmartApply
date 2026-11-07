CREATE TABLE IF NOT EXISTS "comment_likes" (
  "comment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("comment_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "comment_likes_user_id_idx" ON "comment_likes" ("user_id");
CREATE INDEX IF NOT EXISTS "comment_likes_comment_id_type_idx" ON "comment_likes" ("comment_id", "type");

DO $$ BEGIN
  ALTER TABLE "comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
