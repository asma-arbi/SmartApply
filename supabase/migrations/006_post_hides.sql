-- Persist "hide from my feed" so it survives refresh (Supabase).

CREATE TABLE IF NOT EXISTS post_hides (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_hides_user_id_idx ON post_hides (user_id);
