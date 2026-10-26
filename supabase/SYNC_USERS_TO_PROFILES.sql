-- ============================================================
-- SmartApply — SYNC des candidats dans la table profiles
-- Exécuter dans Supabase : SQL Editor > New query > Run
-- ============================================================
-- Ce script est nécessaire si des utilisateurs ont été créés
-- AVANT l'installation du trigger handle_new_user.
-- Il synchronise TOUS les auth.users existants → public.profiles
-- ============================================================

-- 1. Ajouter les colonnes full_name et email si manquantes
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;

-- 2. Insérer ou mettre à jour TOUS les auth.users dans profiles
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

-- 3. Vérifier les résultats
select
  p.id,
  p.role,
  p.full_name,
  p.email,
  p.created_at
from public.profiles p
order by p.created_at desc
limit 20;

select count(*) as total_profiles from public.profiles;
select count(*) as total_auth_users from auth.users;
