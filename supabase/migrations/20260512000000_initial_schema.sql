-- ============================================================
-- MEIPORUL (மெய்பொருள்) — Supabase Schema
-- Version: MVP 1.0
-- Tables: profiles, news_articles, promises, fact_checks, content_drafts
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
-- uuid-ossp not needed; gen_random_uuid() is native in Postgres 14+


-- ============================================================
-- 1. PROFILES
-- Extends Supabase auth.users with role management.
-- Roles: admin (full access), editor (can publish), viewer (read only)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'viewer'
                 check (role in ('admin', 'editor', 'viewer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- 2. NEWS_ARTICLES
-- Stores articles crawled from Tamil Nadu news sources.
-- Crawler inserts via service_role (server-side only).
-- Public can read published articles.
-- ============================================================
create table public.news_articles (
  id              uuid primary key default gen_random_uuid(),
  source_name     text not null,                        -- e.g. 'The Hindu', 'TNM', 'Dinamalar'
  source_url      text not null unique,                 -- original article URL (deduplicate)
  title           text not null,
  title_tamil     text,                                 -- Tamil translation (Claude-generated)
  summary         text,                                 -- Claude-generated English summary
  summary_tamil   text,                                 -- Claude-generated Tamil summary
  published_at    timestamptz,                          -- original publish time from source
  crawled_at      timestamptz not null default now(),
  is_relevant     boolean default false,                -- flagged as relevant to TN politics by Claude
  relevance_score float check (relevance_score between 0 and 1),
  tags            text[],                               -- e.g. ['tvk', 'governance', 'promise']
  status          text not null default 'raw'
                    check (status in ('raw', 'reviewed', 'published', 'archived')),
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_news_articles_status on public.news_articles(status);
create index idx_news_articles_published_at on public.news_articles(published_at desc);
create index idx_news_articles_is_relevant on public.news_articles(is_relevant);
create index idx_news_articles_tags on public.news_articles using gin(tags);

-- RLS
alter table public.news_articles enable row level security;

-- Anyone (including public) can read published articles
create policy "public can read published articles"
  on public.news_articles for select
  using (status = 'published');

-- Editors and admins can read all articles
create policy "editors can read all articles"
  on public.news_articles for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins and editors can insert (crawler uses service_role, bypasses RLS)
create policy "editors can insert articles"
  on public.news_articles for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins and editors can update
create policy "editors can update articles"
  on public.news_articles for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins can delete
create policy "admins can delete articles"
  on public.news_articles for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- 3. PROMISES
-- Core of Meiporul — every TVK promise tracked with evidence.
-- ============================================================
create table public.promises (
  id               uuid primary key default gen_random_uuid(),
  promise_text     text not null,                       -- exact quote of the promise
  promise_tamil    text,                                -- Tamil version
  made_by          text not null default 'Vijay/TVK',   -- who made the promise
  made_on          date not null,                       -- date promise was made
  source_url       text not null,                       -- proof URL (news article, video, etc.)
  source_name      text not null,                       -- e.g. 'Dinamalar', 'The Hindu'
  category         text not null
                     check (category in (
                       'governance', 'economy', 'education',
                       'infrastructure', 'health', 'women',
                       'youth', 'environment', 'other'
                     )),
  status           text not null default 'pending'
                     check (status in (
                       'pending',     -- no action yet
                       'in_progress', -- partially done
                       'fulfilled',   -- done
                       'broken',      -- explicitly not done
                       'unclear'      -- cannot verify
                     )),
  status_updated_at date,                               -- when status last changed
  status_evidence   text,                               -- proof of current status
  status_source_url text,                               -- URL for status evidence
  impact_level     text default 'medium'
                     check (impact_level in ('high', 'medium', 'low')),
  added_by         uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes
create index idx_promises_status on public.promises(status);
create index idx_promises_category on public.promises(category);
create index idx_promises_made_on on public.promises(made_on desc);
create index idx_promises_impact_level on public.promises(impact_level);

-- RLS
alter table public.promises enable row level security;

-- Public can read all promises (this is the transparency layer)
create policy "public can read all promises"
  on public.promises for select
  using (true);

-- Only editors and admins can add promises
create policy "editors can insert promises"
  on public.promises for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only editors and admins can update promise status
create policy "editors can update promises"
  on public.promises for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins can delete promises
create policy "admins can delete promises"
  on public.promises for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- 4. FACT_CHECKS
-- Stores Claude AI verdicts on specific claims.
-- Can be linked to a news article, a promise, or standalone.
-- ============================================================
create table public.fact_checks (
  id              uuid primary key default gen_random_uuid(),
  claim           text not null,                        -- the claim being checked
  claim_tamil     text,                                 -- Tamil version of claim
  verdict         text not null
                    check (verdict in (
                      'true',        -- verified accurate
                      'false',       -- verified inaccurate
                      'misleading',  -- partially true but misleading
                      'unverified',  -- cannot verify with available evidence
                      'satire'       -- satirical content
                    )),
  explanation     text not null,                        -- Claude's explanation
  explanation_tamil text,                               -- Tamil version
  sources         jsonb default '[]',                   -- array of {name, url} objects
  confidence      text default 'medium'
                    check (confidence in ('high', 'medium', 'low')),
  article_id      uuid references public.news_articles(id) on delete set null,
  promise_id      uuid references public.promises(id) on delete set null,
  checked_by      uuid references public.profiles(id),  -- null if AI-generated
  is_ai_generated boolean default true,
  is_published    boolean default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index idx_fact_checks_verdict on public.fact_checks(verdict);
create index idx_fact_checks_is_published on public.fact_checks(is_published);
create index idx_fact_checks_article_id on public.fact_checks(article_id);
create index idx_fact_checks_promise_id on public.fact_checks(promise_id);

-- RLS
alter table public.fact_checks enable row level security;

-- Public can read published fact checks
create policy "public can read published fact checks"
  on public.fact_checks for select
  using (is_published = true);

-- Editors and admins can read all fact checks
create policy "editors can read all fact checks"
  on public.fact_checks for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Editors and admins can insert
create policy "editors can insert fact checks"
  on public.fact_checks for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Editors and admins can update
create policy "editors can update fact checks"
  on public.fact_checks for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins can delete
create policy "admins can delete fact checks"
  on public.fact_checks for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- 5. CONTENT_DRAFTS
-- Claude-generated social media content awaiting review.
-- Editor reviews and approves before publishing via Buffer.
-- ============================================================
create table public.content_drafts (
  id               uuid primary key default gen_random_uuid(),
  theme            text not null,                       -- weekly narrative theme
  content_type     text not null
                     check (content_type in (
                       'tweet', 'instagram_post', 'instagram_story',
                       'whatsapp_message', 'thread'
                     )),
  content_english  text not null,
  content_tamil    text,
  hashtags         text[],
  article_id       uuid references public.news_articles(id) on delete set null,
  promise_id       uuid references public.promises(id) on delete set null,
  fact_check_id    uuid references public.fact_checks(id) on delete set null,
  status           text not null default 'draft'
                     check (status in (
                       'draft',     -- Claude generated, not reviewed
                       'approved',  -- editor approved, ready to schedule
                       'scheduled', -- sent to Buffer
                       'published', -- live on platform
                       'rejected'   -- editor rejected
                     )),
  rejection_reason text,
  generated_by     uuid references public.profiles(id),
  approved_by      uuid references public.profiles(id),
  scheduled_for    timestamptz,
  published_at     timestamptz,
  platform_post_id text,                                -- ID from X/Instagram after publish
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes
create index idx_content_drafts_status on public.content_drafts(status);
create index idx_content_drafts_content_type on public.content_drafts(content_type);
create index idx_content_drafts_scheduled_for on public.content_drafts(scheduled_for);

-- RLS
alter table public.content_drafts enable row level security;

-- Only editors and admins can read drafts (internal tool)
create policy "editors can read all drafts"
  on public.content_drafts for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Editors and admins can create drafts
create policy "editors can insert drafts"
  on public.content_drafts for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Editors and admins can update drafts
create policy "editors can update drafts"
  on public.content_drafts for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'editor')
  );

-- Only admins can delete drafts
create policy "admins can delete drafts"
  on public.content_drafts for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- Auto-updates updated_at on every row change across all tables
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_news_articles
  before update on public.news_articles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_promises
  before update on public.promises
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_fact_checks
  before update on public.fact_checks
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_content_drafts
  before update on public.content_drafts
  for each row execute procedure public.handle_updated_at();


-- ============================================================
-- 7. SEED DATA — First admin user
-- Run this AFTER you sign up your account on Supabase Auth.
-- Replace the email below with your actual email.
-- ============================================================
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-email@gmail.com';


-- ============================================================
-- 8. USEFUL VIEWS (for dashboard queries)
-- ============================================================

-- Promise summary by status
create or replace view public.promise_summary as
select
  status,
  count(*) as total,
  count(*) filter (where impact_level = 'high') as high_impact
from public.promises
group by status;

-- Recent broken/unclear promises (for weekly content briefing)
create or replace view public.broken_promises as
select
  id, promise_text, promise_tamil, made_on,
  source_url, category, status_evidence, impact_level
from public.promises
where status in ('broken', 'unclear')
order by impact_level desc, made_on desc;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
