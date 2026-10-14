-- Job Activity History Migration
-- Execute this in Supabase Dashboard > SQL Editor

-- Create job_activities table
create table public.job_activities (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action_type text not null check (action_type in (
    'created',
    'updated', 
    'published',
    'closed',
    'reopened',
    'deleted'
  )),
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Create indexes for performance
create index job_activities_job_id_idx on public.job_activities(job_id);
create index job_activities_created_at_idx on public.job_activities(created_at desc);
create index job_activities_company_id_idx on public.job_activities(company_id);

-- Enable Row Level Security
alter table public.job_activities enable row level security;

-- Policy: Companies can view activities for their own jobs
create policy "view_own_job_activities" on public.job_activities
  for select using (company_id = auth.uid());

-- Policy: System can insert activities (server actions with verified user)
create policy "system_insert_activities" on public.job_activities
  for insert with check (company_id = auth.uid());

-- Policy: No updates or deletes (audit trail is immutable)
-- Activities are never updated or deleted, only inserted

-- Add comment to table
comment on table public.job_activities is 'Audit trail for job-related actions';
comment on column public.job_activities.action_type is 'Type of action: created, updated, published, closed, reopened, deleted';
comment on column public.job_activities.metadata is 'JSON object containing previous/new values and change details';
