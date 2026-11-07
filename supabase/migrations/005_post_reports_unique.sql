-- One report per user and post (spec: unique signalement).
-- Deduplicate before adding the unique index.

DELETE FROM post_reports a
USING post_reports b
WHERE a.reporter_id = b.reporter_id
  AND a.post_id = b.post_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS post_reports_reporter_post_uidx
  ON post_reports (reporter_id, post_id);
