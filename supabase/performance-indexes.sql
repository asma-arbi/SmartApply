-- Performance Optimization: Add Indexes for Faster Queries
-- Run this in Supabase > SQL Editor to improve query performance

-- Index for filtering jobs by company (used in dashboard)
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);

-- Index for filtering jobs by status (used in filters)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

-- Index for filtering jobs by type (used in filters)
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);

-- Index for filtering jobs by location (used in filters)
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);

-- Composite index for company + status queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON public.jobs(company_id, status);

-- Index for sorting by created_at (used in dashboard ordering)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- Composite index for company + created_at (optimizes dashboard main query)
CREATE INDEX IF NOT EXISTS idx_jobs_company_created ON public.jobs(company_id, created_at DESC);

-- Index for job_activities table (if it exists)
CREATE INDEX IF NOT EXISTS idx_job_activities_job_id ON public.job_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_company_id ON public.job_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_created_at ON public.job_activities(created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE public.jobs;
ANALYZE public.job_activities;
