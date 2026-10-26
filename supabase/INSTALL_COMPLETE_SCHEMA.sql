-- ============================================================
-- SmartApply Tunisia — Installation & Réparation complète
-- Exécuter ce script dans Supabase : SQL Editor > New query > Run
-- ============================================================

-- 1. Table: profiles (Créée pour chaque utilisateur)
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  text not null default 'candidat'
                        check (role in ('candidat', 'entreprise', 'admin')),
  full_name             text,
  email                 text,
  language              text not null default 'fr'
                        check (language in ('fr', 'en')),
  notifications_enabled boolean default true,
  visible_to_companies  boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Colonnes additionnelles si la table existait déjà
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;

-- 2. Table: companies (Entreprises avec attributs complets)
create table if not exists public.companies (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text not null,
  sector           text,
  size             text check (size in ('1-10','11-50','51-200','201-500','500+')),
  city             text,
  logo_url         text,
  website          text,
  linkedin_url     text,
  phone            text,
  description      text,
  status           text not null default 'pending'
                   check (status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at       timestamptz default now()
);

-- 3. Table: jobs (Offres d'emploi et stages)
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

-- 4. Table: consent_records (Historique RGPD)
create table if not exists public.consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tos_version     text not null default '1.0',
  privacy_version text not null default '1.0',
  ai_cv_consent   boolean not null default false,
  consented_at    timestamptz default now()
);

-- ── 5. Auto-confirmation des emails (Indispensable pour dev / tests) ──
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

create or replace function public.auto_confirm_new_user()
returns trigger as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_new_user();

-- ── 6. Trigger automatique de synchronisation de profil à l'inscription ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_role text;
  user_name text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'candidat');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  -- Insertion ou mise à jour automatique dans profiles
  insert into public.profiles (id, role, full_name, email)
  values (new.id, user_role, user_name, new.email)
  on conflict (id) do update set
    role = coalesce(excluded.role, profiles.role),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    email = coalesce(excluded.email, profiles.email),
    updated_at = now();

  -- Si c'est une entreprise, insertion automatique dans companies
  if user_role = 'entreprise' then
    insert into public.companies (id, name, status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'company_name', user_name, 'Entreprise'),
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

-- Synchroniser les utilisateurs auth.users existants qui n'auraient pas encore de profil
insert into public.profiles (id, role, full_name, email)
select id,
       coalesce(raw_user_meta_data->>'role', 'candidat'),
       coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
       email
from auth.users
on conflict (id) do update set
  role = coalesce(excluded.role, profiles.role),
  full_name = coalesce(excluded.full_name, profiles.full_name),
  email = coalesce(excluded.email, profiles.email);

-- ── 7. Définir explicitement les administrateurs initiaux ──
update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com');

update public.profiles
set role = 'admin'
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com')
   or id in (select id from auth.users where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com'));

-- ── 8. Sécurité Row Level Security (RLS) sans récursion infinie ──
alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.jobs            enable row level security;
alter table public.consent_records enable row level security;

-- Policies Profiles : lisibles par tous les utilisateurs connectés ou publiquement (évite la récursion infinie)
drop policy if exists "profil lisible par proprietaire ou admin" on public.profiles;
drop policy if exists "profils lisibles" on public.profiles;
create policy "profils lisibles" on public.profiles
  for select using (true);

drop policy if exists "profil modifiable par proprietaire" on public.profiles;
drop policy if exists "profil modifiable" on public.profiles;
create policy "profil modifiable" on public.profiles
  for update using (auth.uid() = id or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "profil inserable" on public.profiles;
create policy "profil inserable" on public.profiles
  for insert with check (true);

drop policy if exists "profil supprimable par admin" on public.profiles;
create policy "profil supprimable par admin" on public.profiles
  for delete using (auth.uid() = id or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

-- Policies Companies
drop policy if exists "companies lisibles publiquement" on public.companies;
create policy "companies lisibles publiquement" on public.companies
  for select using (true);

drop policy if exists "companies modifiables par proprietaire" on public.companies;
drop policy if exists "companies modifiables par admin" on public.companies;
drop policy if exists "companies modifiables" on public.companies;
create policy "companies modifiables" on public.companies
  for update using (auth.uid() = id or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "companies supprimables par admin" on public.companies;
create policy "companies supprimables par admin" on public.companies
  for delete using (auth.uid() = id or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "companies inserable" on public.companies;
create policy "companies inserable" on public.companies
  for insert with check (true);

-- Policies Jobs
drop policy if exists "offres lisibles publiquement" on public.jobs;
create policy "offres lisibles publiquement" on public.jobs
  for select using (true);

drop policy if exists "offres inserables par entreprise" on public.jobs;
create policy "offres inserables par entreprise" on public.jobs
  for insert with check (company_id = auth.uid() or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "offres modifiables par entreprise" on public.jobs;
drop policy if exists "offres modifiables" on public.jobs;
create policy "offres modifiables" on public.jobs
  for update using (company_id = auth.uid() or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "offres supprimables par entreprise" on public.jobs;
drop policy if exists "offres supprimables" on public.jobs;
create policy "offres supprimables" on public.jobs
  for delete using (company_id = auth.uid() or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

-- Policies Consent Records
drop policy if exists "consentements lisibles" on public.consent_records;
create policy "consentements lisibles" on public.consent_records
  for select using (auth.uid() = user_id or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'));

drop policy if exists "consentements inserable" on public.consent_records;
create policy "consentements inserable" on public.consent_records
  for insert with check (true);

select 'Installation complète SmartApply et configuration Admin réussies avec succès !' as resultat;
