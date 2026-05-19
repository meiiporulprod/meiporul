-- Editable keyword list for Reddit political filtering
-- Each row = one keyword assigned to a party (or 'GENERAL')
-- Crawl logic: post is stored if ANY active keyword matches its title+body

create table if not exists public.reddit_keywords (
  id       uuid primary key default gen_random_uuid(),
  party    text not null,            -- party abbreviation or 'GENERAL'
  keyword  text not null,
  active   boolean not null default true,
  added_at timestamptz not null default now(),
  unique (party, keyword)
);

alter table public.reddit_keywords enable row level security;
create policy "public read keywords"   on public.reddit_keywords for select using (true);
create policy "service insert keywords" on public.reddit_keywords for insert with check (true);
create policy "service update keywords" on public.reddit_keywords for update using (true);
create policy "service delete keywords" on public.reddit_keywords for delete using (true);

create index idx_reddit_keywords_party  on public.reddit_keywords (party);
create index idx_reddit_keywords_active on public.reddit_keywords (active);

-- ── Seed data ─────────────────────────────────────────────────────────────────

insert into public.reddit_keywords (party, keyword) values
  -- TVK / Vijay
  ('TVK', 'tvk'),
  ('TVK', 'tamilaga vettri'),
  ('TVK', 'tamilaga kazhagam'),
  ('TVK', 'vijay'),
  ('TVK', 'actor vijay'),
  ('TVK', 'thalapathy'),
  ('TVK', 'joseph vijay'),

  -- DMK
  ('DMK', 'dmk'),
  ('DMK', 'dravida munnetra kazhagam'),
  ('DMK', 'mk stalin'),
  ('DMK', 'm.k. stalin'),
  ('DMK', 'stalin'),
  ('DMK', 'udhayanidhi'),
  ('DMK', 'udhayanidhi stalin'),
  ('DMK', 'udaya'),          -- colloquial for Udhayanidhi
  ('DMK', 'uday stalin'),    -- colloquial
  ('DMK', 'kanimozhi'),
  ('DMK', 'tr baalu'),
  ('DMK', 't.r. baalu'),
  ('DMK', 'a raja'),
  ('DMK', 'dayanidhi maran'),
  ('DMK', 'duraimurugan'),
  ('DMK', 'senthil balaji'),

  -- AIADMK
  ('AIADMK', 'aiadmk'),
  ('AIADMK', 'anna dravida munnetra kazhagam'),
  ('AIADMK', 'admk'),
  ('AIADMK', 'edappadi'),
  ('AIADMK', 'eps'),
  ('AIADMK', 'palaniswami'),
  ('AIADMK', 'e.p.s'),
  ('AIADMK', 'edapadi'),     -- alternate spelling
  ('AIADMK', 'o panneerselvam'),
  ('AIADMK', 'ops'),
  ('AIADMK', 'o.p.s'),
  ('AIADMK', 'jayalalitha'),
  ('AIADMK', 'jayalalithaa'),
  ('AIADMK', 'amma'),

  -- BJP
  ('BJP', 'bjp'),
  ('BJP', 'bharatiya janata party'),
  ('BJP', 'annamalai'),
  ('BJP', 'k. annamalai'),
  ('BJP', 'tamilisai'),
  ('BJP', 'tamilisai soundararajan'),
  ('BJP', 'l murugan'),
  ('BJP', 'narendran'),

  -- NTK
  ('NTK', 'ntk'),
  ('NTK', 'naam tamilar katchi'),
  ('NTK', 'naam tamilar'),
  ('NTK', 'seeman'),

  -- PMK
  ('PMK', 'pmk'),
  ('PMK', 'pattali makkal katchi'),
  ('PMK', 'anbumani'),
  ('PMK', 'anbumani ramadoss'),
  ('PMK', 'dr ramadoss'),
  ('PMK', 'gk mani'),
  ('PMK', 'g.k. mani'),

  -- VCK
  ('VCK', 'vck'),
  ('VCK', 'viduthalai chiruthaigal katchi'),
  ('VCK', 'thirumavalavan'),
  ('VCK', 'thol thirumavalavan'),

  -- INC
  ('INC', 'congress'),
  ('INC', 'indian national congress'),
  ('INC', 'karti chidambaram'),
  ('INC', 'karti'),
  ('INC', 'p chidambaram'),
  ('INC', 'chidambaram'),

  -- DMDK
  ('DMDK', 'dmdk'),
  ('DMDK', 'desiya murpokku dravida kazhagam'),
  ('DMDK', 'vijayakanth'),
  ('DMDK', 'captain vijayakanth'),
  ('DMDK', 'premalatha'),
  ('DMDK', 'premalatha vijayakanth'),

  -- MDMK
  ('MDMK', 'mdmk'),
  ('MDMK', 'marumalarchi dravida munnetra kazhagam'),
  ('MDMK', 'vaiko'),

  -- CPI(M)
  ('CPI(M)', 'cpi(m)'),
  ('CPI(M)', 'communist party'),
  ('CPI(M)', 'tk rangarajan'),
  ('CPI(M)', 't.k. rangarajan'),

  -- IUML
  ('IUML', 'iuml'),
  ('IUML', 'indian union muslim league'),
  ('IUML', 'navaz kani'),

  -- General political terms (not tied to one party)
  ('GENERAL', 'tn election'),
  ('GENERAL', 'tn govt'),
  ('GENERAL', 'tn government'),
  ('GENERAL', 'tn politics'),
  ('GENERAL', '2026 election'),
  ('GENERAL', 'tnla 2026'),
  ('GENERAL', 'tamilnadu election'),
  ('GENERAL', 'tamil nadu election'),
  ('GENERAL', 'tamil nadu government'),
  ('GENERAL', 'tamil nadu politics'),
  ('GENERAL', 'assembly election'),
  ('GENERAL', 'manifesto'),
  ('GENERAL', 'vote share'),
  ('GENERAL', 'constituency')

on conflict (party, keyword) do nothing;
