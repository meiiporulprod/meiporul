-- Per-booth election data (Form 20)
create table if not exists public.election_booths (
  id               uuid primary key default gen_random_uuid(),
  constituency_id  uuid not null references public.election_constituencies(id) on delete cascade,
  election_year    int  not null default 2026,
  booth_number     int  not null,
  booth_name       text,
  created_at       timestamptz not null default now(),
  unique (constituency_id, election_year, booth_number)
);

create table if not exists public.election_booth_results (
  id             uuid primary key default gen_random_uuid(),
  booth_id       uuid not null references public.election_booths(id) on delete cascade,
  candidate_name text not null,
  party          text not null default 'IND',
  votes          int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (booth_id, candidate_name)
);

create index idx_booths_constituency on public.election_booths(constituency_id, election_year);
create index idx_booth_results_booth on public.election_booth_results(booth_id);
create index idx_booth_results_party on public.election_booth_results(party);

alter table public.election_booths        enable row level security;
alter table public.election_booth_results enable row level security;

create policy "public read booths"
  on public.election_booths for select using (true);

create policy "public read booth results"
  on public.election_booth_results for select using (true);

create policy "service insert booths"
  on public.election_booths for insert with check (true);

create policy "service update booths"
  on public.election_booths for update using (true);

create policy "service insert booth results"
  on public.election_booth_results for insert with check (true);

create policy "service update booth results"
  on public.election_booth_results for update using (true);
