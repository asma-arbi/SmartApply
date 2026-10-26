-- =====================================================================
-- SMARTAPPLY TUNISIA — SCRIPT DE CORRECTION DÉFINITIVE SUPABASE (1 CLIC)
-- =====================================================================
-- À copier-coller et exécuter dans :
-- Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- ── 1. SUPPRIMER LES ANCIENNES POLICIES RÉCURSIVES (Erreur 42P17) ──
drop policy if exists "profil lisible par proprietaire ou admin" on public.profiles;
drop policy if exists "profils lisibles" on public.profiles;
drop policy if exists "profil modifiable par proprietaire" on public.profiles;
drop policy if exists "profil modifiable" on public.profiles;
drop policy if exists "profil inserable" on public.profiles;
drop policy if exists "profil supprimable par admin" on public.profiles;
drop policy if exists "profils_select" on public.profiles;
drop policy if exists "profils_insert" on public.profiles;
drop policy if exists "profils_update" on public.profiles;
drop policy if exists "profils_delete" on public.profiles;

drop policy if exists "companies lisibles publiquement" on public.companies;
drop policy if exists "companies modifiables par proprietaire" on public.companies;
drop policy if exists "companies modifiables par admin" on public.companies;
drop policy if exists "companies modifiables" on public.companies;
drop policy if exists "companies supprimables par admin" on public.companies;
drop policy if exists "companies inserable" on public.companies;
drop policy if exists "companies_select" on public.companies;
drop policy if exists "companies_insert" on public.companies;
drop policy if exists "companies_update" on public.companies;
drop policy if exists "companies_delete" on public.companies;

drop policy if exists "offres lisibles publiquement" on public.jobs;
drop policy if exists "offres inserables par entreprise" on public.jobs;
drop policy if exists "offres modifiables par entreprise" on public.jobs;
drop policy if exists "offres modifiables" on public.jobs;
drop policy if exists "offres supprimables par entreprise" on public.jobs;
drop policy if exists "offres supprimables" on public.jobs;
drop policy if exists "jobs_select" on public.jobs;
drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;

drop policy if exists "consentements lisibles" on public.consent_records;
drop policy if exists "consentements inserable" on public.consent_records;

-- ── 2. NOUVELLES POLICIES SAINES ET SANS AUCUNE RÉCURSION ──
-- Table Profiles
create policy "profiles_allow_select" on public.profiles for select using (true);
create policy "profiles_allow_insert" on public.profiles for insert with check (true);
create policy "profiles_allow_update" on public.profiles for update using (true);
create policy "profiles_allow_delete" on public.profiles for delete using (true);

-- Table Companies
create policy "companies_allow_select" on public.companies for select using (true);
create policy "companies_allow_insert" on public.companies for insert with check (true);
create policy "companies_allow_update" on public.companies for update using (true);
create policy "companies_allow_delete" on public.companies for delete using (true);

-- Table Jobs
create policy "jobs_allow_select" on public.jobs for select using (true);
create policy "jobs_allow_insert" on public.jobs for insert with check (true);
create policy "jobs_allow_update" on public.jobs for update using (true);
create policy "jobs_allow_delete" on public.jobs for delete using (true);

-- Table Consent
create policy "consent_allow_select" on public.consent_records for select using (true);
create policy "consent_allow_insert" on public.consent_records for insert with check (true);

-- ── 3. ASSURER LES COLONNES COMPLÈTES ──
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.companies add column if not exists sector text;
alter table public.companies add column if not exists size text;
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists linkedin_url text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists description text;
alter table public.companies add column if not exists status text default 'pending';

-- ── 4. AUTO-CONFIRMATION DE TOUS LES UTILISATEURS EXISTANTS ET FUTURS ──
-- Auto-confirmer immédiatement tous les comptes auth.users (même mails virtuels)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- Trigger pour auto-confirmer automatiquement chaque nouvel utilisateur dès l'inscription
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

-- ── 5. SYNCHRONISATION INSTANTANÉE DE TOUS LES CANDIDATS DANS PROFILES ──
-- Transfère tous les utilisateurs enregistrés dans auth.users vers public.profiles
insert into public.profiles (id, role, full_name, email, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'role', 'candidat') as role,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) as full_name,
  u.email,
  u.created_at
from auth.users u
on conflict (id) do update set
  role      = coalesce(excluded.role, profiles.role),
  full_name = coalesce(excluded.full_name, profiles.full_name),
  email     = coalesce(excluded.email, profiles.email);

-- ── 6. DÉFINIR VOTRE COMPTE SUPER ADMIN ──
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com');

update public.profiles
set role = 'admin'
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com')
   or id in (select id from auth.users where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com'));

-- ── 7. RAPPORT DE VÉRIFICATION EN SORTIE ──
select
  count(*) as nb_profils_synchronises,
  count(case when role = 'candidat' then 1 end) as nb_candidats,
  count(case when role = 'entreprise' then 1 end) as nb_entreprises,
  count(case when role = 'admin' then 1 end) as nb_admins
from public.profiles;
