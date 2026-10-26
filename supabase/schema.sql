-- ============================================================
-- SmartApply Tunisia — Schéma complet
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- ── Table: companies ──────────────────────────────────────
create table if not exists public.companies (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  sector      text,
  size        text check (size in ('1-10','11-50','51-200','201-500','500+')),
  city        text,
  logo_url    text,
  website     text,
  linkedin_url text,
  phone       text,
  description text,
  status      text not null default 'pending'
              check (status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at  timestamptz default now()
);

-- ── Table: jobs ───────────────────────────────────────────
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  location    text not null,
  type        text not null default 'CDI',
  description text not null,
  status      text not null default 'published'
              check (status in ('draft','published','closed')),
  created_at  timestamptz default now()
);

-- ── Table: profiles ───────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  text not null default 'candidat'
                        check (role in ('candidat', 'entreprise', 'admin')),
  language              text not null default 'fr'
                        check (language in ('fr', 'en')),
  notifications_enabled boolean default true,
  visible_to_companies  boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── Table: consent_records (A7) ──────────────────────────
create table if not exists public.consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tos_version     text not null default '1.0',
  privacy_version text not null default '1.0',
  ai_cv_consent   boolean not null default false,
  consented_at    timestamptz default now()
);

-- ── Trigger: création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'candidat');

  -- Profil pour tous les utilisateurs
  insert into public.profiles (id, role)
  values (new.id, user_role)
  on conflict (id) do nothing;

  -- Entrée entreprise uniquement si rôle = entreprise
  if user_role = 'entreprise' then
    insert into public.companies (id, name, status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'company_name',
               new.raw_user_meta_data->>'name',
               'Entreprise'),
      'pending'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Sécurité RLS ─────────────────────────────────────────
alter table public.companies     enable row level security;
alter table public.jobs          enable row level security;
alter table public.profiles      enable row level security;
alter table public.consent_records enable row level security;

-- Policies: companies
drop policy if exists "companies lisibles" on public.companies;
create policy "companies lisibles" on public.companies for select using (true);

drop policy if exists "companies modifiables par proprietaire" on public.companies;
create policy "companies modifiables par proprietaire" on public.companies
  for update using (auth.uid() = id);

drop policy if exists "companies inserable a l inscription" on public.companies;
create policy "companies inserable a l inscription" on public.companies
  for insert with check (auth.uid() = id);

drop policy if exists "companies modifiables par admin" on public.companies;
create policy "companies modifiables par admin" on public.companies
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies: jobs
drop policy if exists "offres publiees visibles" on public.jobs;
create policy "offres publiees visibles" on public.jobs
  for select using (status = 'published' or company_id = auth.uid());

drop policy if exists "creer ses offres" on public.jobs;
create policy "creer ses offres" on public.jobs
  for insert with check (company_id = auth.uid());

drop policy if exists "modifier ses offres" on public.jobs;
create policy "modifier ses offres" on public.jobs
  for update using (company_id = auth.uid());

drop policy if exists "supprimer ses offres" on public.jobs;
create policy "supprimer ses offres" on public.jobs
  for delete using (company_id = auth.uid());

-- Policies: profiles
drop policy if exists "profil lisible par proprietaire" on public.profiles;
create policy "profil lisible par proprietaire" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profil modifiable par proprietaire" on public.profiles;
create policy "profil modifiable par proprietaire" on public.profiles
  for update using (auth.uid() = id);

-- Policies: consent_records
drop policy if exists "consentements lisibles" on public.consent_records;
create policy "consentements lisibles" on public.consent_records
  for select using (auth.uid() = user_id);

drop policy if exists "consentements inserable" on public.consent_records;
create policy "consentements inserable" on public.consent_records
  for insert with check (auth.uid() = user_id);
