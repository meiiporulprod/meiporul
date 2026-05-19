-- Monitored social media accounts (Twitter/X and Instagram)
create table if not exists public.monitored_accounts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null check (platform in ('twitter', 'instagram')),
  handle       text not null,
  display_name text,
  party        text,
  active       boolean not null default true,
  added_at     timestamptz not null default now(),
  unique (platform, handle)
);

alter table public.monitored_accounts enable row level security;
create policy "public read monitored accounts"   on public.monitored_accounts for select using (true);
create policy "service manage monitored accounts" on public.monitored_accounts for all    using (true);

-- Posts fetched from monitored accounts
create table if not exists public.monitored_posts (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.monitored_accounts(id) on delete cascade,
  platform     text not null check (platform in ('twitter', 'instagram')),
  post_id      text not null,
  content      text not null default '',
  url          text not null default '',
  media_urls   text[] not null default '{}',
  posted_at    timestamptz,
  fetched_at   timestamptz not null default now(),
  likes        integer not null default 0,
  reposts      integer not null default 0,
  replies      integer not null default 0,
  views        integer not null default 0,
  unique (platform, post_id)
);

alter table public.monitored_posts enable row level security;
create policy "public read monitored posts"   on public.monitored_posts for select using (true);
create policy "service manage monitored posts" on public.monitored_posts for all    using (true);

create index idx_monitored_posts_account_id on public.monitored_posts (account_id);
create index idx_monitored_posts_posted_at  on public.monitored_posts (posted_at desc);
create index idx_monitored_posts_platform   on public.monitored_posts (platform);

-- Community notes: user-submitted context/corrections for political claims
create table if not exists public.community_notes (
  id           uuid primary key default gen_random_uuid(),
  tweet_url    text not null,
  note_text    text not null check (char_length(note_text) between 10 and 280),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  upvotes      integer not null default 0,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references auth.users(id)
);

alter table public.community_notes enable row level security;
create policy "public read approved notes"  on public.community_notes for select using (status = 'approved');
create policy "owner read own notes"        on public.community_notes for select using (auth.uid() = submitted_by);
create policy "auth users submit notes"     on public.community_notes for insert with check (auth.uid() = submitted_by);
create policy "admin manage notes"          on public.community_notes for all    using (auth.email() = 'workwithroshanrk@gmail.com');

create index idx_community_notes_tweet_url on public.community_notes (tweet_url);
create index idx_community_notes_status    on public.community_notes (status);

-- Seed TVK Twitter accounts to monitor
insert into public.monitored_accounts (platform, handle, display_name, party) values
  ('twitter', 'jana_naayagan',  'Jana Naayagan',  'TVK'),
  ('twitter', 'ramk8060',       'Ram K',          'TVK'),
  ('twitter', 'michel_offl',    'Michel',         'TVK'),
  ('twitter', 'pokkiri_victor', 'Pokkiri Victor', 'TVK'),
  ('twitter', 'ogprasanna',     'OG Prasanna',    'TVK')
on conflict (platform, handle) do nothing;
