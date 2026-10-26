-- ============================================================
-- SmartApply — Patch inscription candidat/entreprise
-- Exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Policy INSERT manquante sur profiles
--    (Sans ça, l'upsert du profil échoue côté RLS)
drop policy if exists "profil inserable a l inscription" on public.profiles;
create policy "profil inserable a l inscription" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. S'assurer que le trigger existe et fonctionne
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'candidat');

  insert into public.profiles (id, role)
  values (new.id, user_role)
  on conflict (id) do nothing;

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

-- 3. Policy INSERT manquante sur consent_records
--    (Autorise aussi les users non encore confirmés via service role)
drop policy if exists "consentements inserable" on public.consent_records;
create policy "consentements inserable" on public.consent_records
  for insert with check (true);  -- Le user_id est validé par la FK auth.users

-- Vérification
select 'Patch appliqué avec succès ✅' as status;
