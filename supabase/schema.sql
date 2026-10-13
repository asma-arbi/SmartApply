-- À exécuter dans Supabase > SQL Editor
create table public.companies (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  website text,
  description text,
  created_at timestamptz default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  location text not null,
  type text not null default 'CDI',
  description text not null,
  status text not null default 'published' check (status in ('draft','published','closed')),
  created_at timestamptz default now()
);

-- Création automatique de l'entreprise à l'inscription
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.companies (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Entreprise'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sécurité (RLS)
alter table public.companies enable row level security;
alter table public.jobs enable row level security;

create policy "companies lisibles" on public.companies for select using (true);
create policy "companies modifiables par le proprietaire" on public.companies
  for update using (auth.uid() = id);

create policy "offres publiees visibles, brouillons visibles par le proprietaire" on public.jobs
  for select using (status = 'published' or company_id = auth.uid());
create policy "creer ses offres" on public.jobs for insert with check (company_id = auth.uid());
create policy "modifier ses offres" on public.jobs for update using (company_id = auth.uid());
create policy "supprimer ses offres" on public.jobs for delete using (company_id = auth.uid());
