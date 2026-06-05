-- ============================================================
-- COMMAND App — SQL Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null,
  role         text not null check (role in ('programmer','marketer','strategist')),
  avatar_color text not null default '#484f58',
  created_at   timestamptz default now()
);

-- 2. tasks
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  priority     text not null default 'medium' check (priority in ('low','medium','high','critical')),
  assigned_to  uuid references auth.users,
  assigned_by  uuid references auth.users,
  workspace    text check (workspace in ('dev','marketing','strategy','revisions','general')),
  due_date     date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  updated_by   uuid references auth.users
);

-- 3. task_comments
create table if not exists public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks on delete cascade,
  user_id    uuid not null references auth.users,
  text       text not null,
  created_at timestamptz default now()
);

-- 4. task_attachments
create table if not exists public.task_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks on delete cascade,
  user_id     uuid not null references auth.users,
  file_url    text not null,
  file_name   text not null,
  file_type   text,
  uploaded_at timestamptz default now()
);

-- 5. task_history
create table if not exists public.task_history (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks on delete cascade,
  user_id    uuid references auth.users,
  action     text not null,
  detail     text,
  created_at timestamptz default now()
);

-- 6. marketing_entries
create table if not exists public.marketing_entries (
  id              uuid primary key default gen_random_uuid(),
  month           int not null check (month between 1 and 12),
  year            int not null,
  platform        text,
  source          text,
  asset_name      text,
  asset_type      text,
  budget_spent    numeric(12,2) default 0,
  reach           int default 0,
  impressions     int default 0,
  clicks          int default 0,
  leads_forecast  int default 0,
  leads_actual    int default 0,
  product_price   numeric(12,2),
  cpl             numeric(12,2),
  roi             numeric(8,2),
  notes           text,
  status          text default 'planned' check (status in ('active','paused','done','planned')),
  extra_data      jsonb default '{}',
  created_by      uuid references auth.users,
  created_at      timestamptz default now(),
  updated_by      uuid references auth.users,
  updated_at      timestamptz default now()
);

-- 7. marketing_custom_columns
create table if not exists public.marketing_custom_columns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'text',
  col_order  int default 99,
  visible    boolean default true,
  created_by uuid references auth.users
);

-- 8. revisions
create table if not exists public.revisions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  assigned_to     uuid references auth.users,
  assigned_by     uuid references auth.users,
  due_date        date,
  reminder_date   date,
  status          text default 'pending' check (status in ('pending','in_progress','done')),
  priority        text default 'medium' check (priority in ('low','medium','high','critical')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 9. content_entries
create table if not exists public.content_entries (
  id           uuid primary key default gen_random_uuid(),
  platform     text,
  account_name text,
  content_type text,
  reach        int default 0,
  engagement   int default 0,
  post_date    date,
  notes        text,
  created_at   timestamptz default now()
);

-- 10. scenarios
create table if not exists public.scenarios (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  channel          text,
  target_audience  text,
  hypothesis       text,
  expected_result  text,
  status           text default 'hypothesis',
  notes            text,
  created_at       timestamptz default now()
);

-- 11. competitor_analysis
create table if not exists public.competitor_analysis (
  id              uuid primary key default gen_random_uuid(),
  competitor_name text not null,
  platform        text,
  followers       int,
  avg_reach       int,
  content_type    text,
  strengths       text,
  weaknesses      text,
  notes           text,
  updated_at      timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_history enable row level security;
alter table public.marketing_entries enable row level security;
alter table public.marketing_custom_columns enable row level security;
alter table public.revisions enable row level security;
alter table public.content_entries enable row level security;
alter table public.scenarios enable row level security;
alter table public.competitor_analysis enable row level security;

-- Helper: authenticated users get full access
do $$
declare
  tname text;
begin
  foreach tname in array array[
    'profiles','tasks','task_comments','task_attachments','task_history',
    'marketing_entries','marketing_custom_columns','revisions',
    'content_entries','scenarios','competitor_analysis'
  ]
  loop
    execute format('
      create policy "auth_select_%1$s" on public.%1$s
        for select using (auth.role() = ''authenticated'');
      create policy "auth_insert_%1$s" on public.%1$s
        for insert with check (auth.role() = ''authenticated'');
      create policy "auth_update_%1$s" on public.%1$s
        for update using (auth.role() = ''authenticated'');
      create policy "auth_delete_%1$s" on public.%1$s
        for delete using (auth.role() = ''authenticated'');
    ', tname);
  end loop;
end $$;

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'programmer'),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#484f58')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Supabase Storage bucket for attachments
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "auth_storage_select" on storage.objects
  for select using (auth.role() = 'authenticated');
create policy "auth_storage_insert" on storage.objects
  for insert with check (auth.role() = 'authenticated');
create policy "auth_storage_update" on storage.objects
  for update using (auth.role() = 'authenticated');
create policy "auth_storage_delete" on storage.objects
  for delete using (auth.role() = 'authenticated');
