-- ============================================================
-- ELECTION DATA — Tamil Nadu Legislative Assembly 2026
-- 234 constituencies, all candidates, results
-- ============================================================

create table public.election_constituencies (
  id          uuid primary key default gen_random_uuid(),
  number      int  not null unique,   -- 1-234 official constituency number
  name        text not null,
  name_tamil  text,
  district    text,
  reservation text default 'general'
                check (reservation in ('general', 'sc', 'st')),
  created_at  timestamptz not null default now()
);

create table public.election_results (
  id               uuid primary key default gen_random_uuid(),
  constituency_id  uuid not null references public.election_constituencies(id) on delete cascade,
  election_year    int  not null default 2026,
  candidate_name   text not null,
  party            text not null,
  evm_votes        int  not null default 0,
  postal_votes     int  not null default 0,
  total_votes      int  not null default 0,
  vote_share       numeric(5,2),
  rank             int,
  is_winner        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (constituency_id, election_year, candidate_name)
);

create index idx_election_results_constituency on public.election_results(constituency_id);
create index idx_election_results_party        on public.election_results(party);
create index idx_election_results_winner       on public.election_results(is_winner) where is_winner = true;
create index idx_election_constituencies_num   on public.election_constituencies(number);

-- RLS: public read
alter table public.election_constituencies enable row level security;
alter table public.election_results        enable row level security;

create policy "public read constituencies"
  on public.election_constituencies for select using (true);

create policy "public read results"
  on public.election_results for select using (true);

create policy "service role insert constituencies"
  on public.election_constituencies for insert
  with check (true);

create policy "service role update constituencies"
  on public.election_constituencies for update
  using (true);

create policy "service role insert results"
  on public.election_results for insert
  with check (true);

create policy "service role update results"
  on public.election_results for update
  using (true);

-- Summary view: winner, runner-up, margin per constituency
create or replace view public.constituency_summary as
select
  c.id,
  c.number,
  c.name,
  c.name_tamil,
  c.district,
  c.reservation,
  w.candidate_name  as winner_name,
  w.party           as winner_party,
  w.total_votes     as winner_votes,
  w.vote_share      as winner_vote_share,
  r.candidate_name  as runner_name,
  r.party           as runner_party,
  r.total_votes     as runner_votes,
  (w.total_votes - r.total_votes) as margin,
  t.total_votes,
  t.candidate_count
from public.election_constituencies c
left join public.election_results w
  on  w.constituency_id = c.id
  and w.election_year   = 2026
  and w.rank            = 1
left join public.election_results r
  on  r.constituency_id = c.id
  and r.election_year   = 2026
  and r.rank            = 2
left join (
  select
    constituency_id,
    sum(total_votes)  as total_votes,
    count(*)          as candidate_count
  from public.election_results
  where election_year = 2026
  group by constituency_id
) t on t.constituency_id = c.id;
