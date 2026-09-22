create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  display_name text,
  avatar_url text,
  timezone text default 'UTC',
  dashboard_layout jsonb default '{}',
  theme_prefs jsonb default '{}',
  created_at timestamptz default now()
);

-- User-facing identity: unique username chosen at sign-up.
alter table profiles add column if not exists username text;
create unique index if not exists profiles_username_key on profiles (username);

create table if not exists events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  title text not null, description text, start_time timestamptz not null, end_time timestamptz,
  all_day boolean default false, color text, created_at timestamptz default now()
);
create table if not exists todos (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  title text not null, notes text, due_date timestamptz, is_complete boolean default false,
  priority smallint default 0, position integer, created_at timestamptz default now()
);
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  entry_date date not null, content text, mood text, created_at timestamptz default now()
);
create table if not exists habits (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  name text not null, icon text, target_frequency text, tree_stage integer default 0,
  current_streak integer default 0, longest_streak integer default 0, created_at timestamptz default now()
);
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(), habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null, completed_at date not null,
  created_at timestamptz default now(), unique (habit_id, completed_at)
);
create table if not exists routines (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  name text not null, steps jsonb default '[]', days_active text[], created_at timestamptz default now()
);

-- Weekly timetable blocks (0 = Monday .. 6 = Sunday, start_time is 'HH:MM')
create table if not exists routine_blocks (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  title text not null, day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time text not null, duration_minutes integer not null default 30,
  color text default '#6366f1', position integer default 0, created_at timestamptz default now()
);
create table if not exists pomodoro_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade not null,
  started_at timestamptz not null, duration_minutes integer not null, type text,
  completed boolean default false
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table events enable row level security;
alter table todos enable row level security;
alter table journal_entries enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table routines enable row level security;
alter table routine_blocks enable row level security;
alter table pomodoro_sessions enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['events','todos','journal_entries','habits','habit_logs','routines','routine_blocks','pomodoro_sessions']
  loop
    execute format('drop policy if exists "Users manage their own %1$s" on %1$I', table_name);
    execute format('create policy "Users manage their own %1$s" on %1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
  end loop;
end $$;

drop policy if exists "Users manage their own profiles" on profiles;
create policy "Users manage their own profiles" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
