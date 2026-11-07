-- Posts-only: drop FKs to users/companies/jobs if they still exist,
-- and allow creating a post without a company row.

ALTER TABLE posts ALTER COLUMN company_id DROP NOT NULL;
