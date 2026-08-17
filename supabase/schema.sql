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
