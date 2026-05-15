-- Forum: public profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  created_at timestamptz default now() not null
);

-- Auto-create profile row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Forum posts
create table if not exists public.forum_posts (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  tab              text not null check (tab in ('fake_news', 'report_id')),
  title            text not null,
  content          text not null,
  source_url       text,
  platform         text check (platform in ('twitter', 'instagram', 'facebook', 'youtube', null)),
  handle           text,
  status           text not null default 'pending'
                     check (status in ('pending', 'ai_checked', 'verified_fake', 'resolved', 'rejected')),
  ai_verdict       text,
  ai_verdict_label text,
  ai_party_response text,
  created_at       timestamptz default now() not null
);

-- Forum report actions (users marking "I reported this ID")
create table if not exists public.forum_actions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  post_id     uuid references public.forum_posts(id) on delete cascade not null,
  action_type text not null check (action_type in ('reported_id', 'upvote')),
  created_at  timestamptz default now() not null,
  unique(user_id, post_id, action_type)
);

-- View: posts with author username + action counts
create or replace view public.forum_posts_view as
  select
    fp.*,
    p.username,
    count(distinct case when fa.action_type = 'reported_id' then fa.id end)::int as report_action_count,
    count(distinct case when fa.action_type = 'upvote'      then fa.id end)::int as upvote_count
  from public.forum_posts fp
  left join public.profiles p on p.id = fp.user_id
  left join public.forum_actions fa on fa.post_id = fp.id
  group by fp.id, p.username;

-- RLS
alter table public.profiles      enable row level security;
alter table public.forum_posts   enable row level security;
alter table public.forum_actions enable row level security;

-- profiles: anyone can read; users manage their own
create policy "public profiles readable"  on public.profiles for select using (true);
create policy "users insert own profile"  on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile"  on public.profiles for update using (auth.uid() = id);

-- forum_posts: anyone can read; auth users can insert; only service role updates (AI/admin)
create policy "posts readable by all"     on public.forum_posts for select using (true);
create policy "auth users can post"       on public.forum_posts for insert with check (auth.uid() = user_id);

-- forum_actions: auth users manage their own
create policy "actions readable by all"   on public.forum_actions for select using (true);
create policy "auth users can act"        on public.forum_actions for insert with check (auth.uid() = user_id);
create policy "users delete own actions"  on public.forum_actions for delete using (auth.uid() = user_id);
