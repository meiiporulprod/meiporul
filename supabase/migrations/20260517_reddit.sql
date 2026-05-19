-- Reddit crawl data: configurable sources + crawled posts with sentiment
create table if not exists public.reddit_sources (
  id          uuid primary key default gen_random_uuid(),
  subreddit   text not null unique,
  description text,
  active      boolean not null default true,
  added_at    timestamptz not null default now()
);

create table if not exists public.reddit_posts (
  post_id         text primary key,
  subreddit       text not null,
  title           text not null,
  selftext        text not null default '',
  url             text,
  permalink       text,
  author          text,
  score           int  not null default 0,
  upvote_ratio    float,
  num_comments    int  not null default 0,
  created_utc     timestamptz not null,
  fetched_at      timestamptz not null default now(),
  party_mentions  text[] not null default '{}',
  sentiment_score float,
  sentiment_label text check (sentiment_label in ('positive', 'negative', 'neutral')),
  is_relevant     boolean not null default false
);

create index idx_reddit_posts_created   on public.reddit_posts (created_utc desc);
create index idx_reddit_posts_relevant  on public.reddit_posts (is_relevant, created_utc desc);
create index idx_reddit_posts_sub       on public.reddit_posts (subreddit);
create index idx_reddit_posts_party     on public.reddit_posts using gin (party_mentions);
create index idx_reddit_posts_sentiment on public.reddit_posts (sentiment_label);

alter table public.reddit_sources enable row level security;
alter table public.reddit_posts   enable row level security;

create policy "public read sources"    on public.reddit_sources for select using (true);
create policy "public read posts"      on public.reddit_posts   for select using (true);
create policy "service insert sources" on public.reddit_sources for insert with check (true);
create policy "service update sources" on public.reddit_sources for update using (true);
create policy "service delete sources" on public.reddit_sources for delete using (true);
create policy "service insert posts"   on public.reddit_posts   for insert with check (true);
create policy "service update posts"   on public.reddit_posts   for update using (true);
create policy "service delete posts"   on public.reddit_posts   for delete using (true);

-- Seed initial subreddits
insert into public.reddit_sources (subreddit, description) values
  ('tamilnadu',    'Tamil Nadu general — all posts crawled'),
  ('india',        'India-wide — filtered for TN content'),
  ('IndiaPolitics','India politics — filtered for TN content'),
  ('southindia',   'South India regional — filtered for TN content'),
  ('TVKFails',     'TVK criticism subreddit — all posts crawled'),
  ('kollywood',    'Tamil cinema — filtered for TN content'),
  ('chennaicity',  'Chennai city — all posts crawled')
on conflict (subreddit) do nothing;
