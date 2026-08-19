create table if not exists public.leads (
  id uuid primary key,
  email text not null,
  template_title text not null default '',
  template_path text not null default '',
  landing_path text not null default '',
  downloaded_at timestamptz,
  submitted_at timestamptz not null default now(),
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists leads_submitted_at_idx
  on public.leads (submitted_at desc);

create index if not exists leads_template_path_idx
  on public.leads (template_path);

alter table public.leads enable row level security;

create table if not exists public.analytics_events (
  id uuid primary key,
  event_name text not null,
  path text not null default '',
  template_title text not null default '',
  template_path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  user_agent text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);

create index if not exists analytics_events_path_idx
  on public.analytics_events (path);

alter table public.analytics_events enable row level security;

create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  template_title text not null default '',
  template_path text not null default '',
  status text not null default 'draft',
  contract_data jsonb not null default '{}'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  signers jsonb not null default '[]'::jsonb,
  clauses jsonb not null default '{}'::jsonb,
  audit_events jsonb not null default '[]'::jsonb,
  template_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_updated_at_idx
  on public.documents (user_id, updated_at desc);

create index if not exists documents_template_path_idx
  on public.documents (template_path);

alter table public.documents enable row level security;

grant select, insert, update, delete on public.documents to authenticated;

drop policy if exists "Users can read own documents" on public.documents;
create policy "Users can read own documents"
  on public.documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_documents_updated_at();

create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  stripe_customer_id text not null default '',
  stripe_subscription_id text not null default '',
  plan text not null default 'free',
  status text not null default 'inactive',
  price_id text not null default '',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_profiles_stripe_customer_idx
  on public.billing_profiles (stripe_customer_id)
  where stripe_customer_id <> '';

create index if not exists billing_profiles_status_idx
  on public.billing_profiles (status);

alter table public.billing_profiles enable row level security;

grant select on public.billing_profiles to authenticated;

drop policy if exists "Users can read own billing profile" on public.billing_profiles;
create policy "Users can read own billing profile"
  on public.billing_profiles
  for select
  using (auth.uid() = user_id);

create or replace function public.set_billing_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists billing_profiles_set_updated_at on public.billing_profiles;
create trigger billing_profiles_set_updated_at
  before update on public.billing_profiles
  for each row execute function public.set_billing_profiles_updated_at();
