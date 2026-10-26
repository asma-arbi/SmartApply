-- ============================================================
-- SmartApply — Configuration directe du Super Administrateur
-- Exécuter dans Supabase : SQL Editor > New query > Run
-- ============================================================

-- 1. Auto-confirmer immédiatement tous les emails non confirmés
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 2. Activer les droits d'administration pour asma.arbi@esprit.tn et asmaarbi27@gmail.com
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com');

-- 3. Insérer ou mettre à jour le rôle 'admin' dans profiles
insert into public.profiles (id, role, full_name, email, updated_at)
select id,
       'admin',
       coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
       email,
       now()
from auth.users
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com')
on conflict (id) do update set
  role = 'admin',
  full_name = coalesce(excluded.full_name, profiles.full_name),
  email = coalesce(excluded.email, profiles.email),
  updated_at = now();

select id, email, raw_user_meta_data->>'role' as user_role, email_confirmed_at
from auth.users
where email in ('asma.arbi@esprit.tn', 'asmaarbi27@gmail.com');
