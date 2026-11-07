-- LinkedIn-style publication options. Additive only: does not touch deleted_at or existing policies.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_kind text NOT NULL DEFAULT 'TEXT';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_mode text NOT NULL DEFAULT 'ANYONE';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS event jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS celebration jsonb;

CREATE TABLE IF NOT EXISTS post_poll_votes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_poll_votes_post_id_idx ON post_poll_votes (post_id);
