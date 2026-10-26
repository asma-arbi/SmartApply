-- Ajouter des colonnes riches à companies
alter table public.companies add column if not exists sector text;
alter table public.companies add column if not exists size text check (size in ('1-10','11-50','51-200','201-500','500+'));
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists linkedin_url text;
alter table public.companies add column if not exists phone text;

-- Politiques RLS pour la modération admin
drop policy if exists "companies modifiables par admin" on public.companies;
create policy "companies modifiables par admin" on public.companies
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
