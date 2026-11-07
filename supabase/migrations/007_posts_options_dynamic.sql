-- Posts options only: schedule / pin / repost / mentions / FUNNY

ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'FUNNY';

ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of_id uuid;

CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON posts (scheduled_at);
CREATE INDEX IF NOT EXISTS posts_pinned_at_idx ON posts (pinned_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS posts_repost_of_id_idx ON posts (repost_of_id);
