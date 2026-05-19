# மெய்பொருள் · Meiporul

Tamil Nadu political accountability platform. Tracks promises, election results, booth-wise data, and public sentiment across all 234 constituencies.

**Live:** [meiporul.vercel.app](https://meiporul.vercel.app)

---

## What it does

| Page | Description |
|---|---|
| `/promises` | Manifesto promises with status (pending / in progress / fulfilled / broken) |
| `/elections` | 2026 TN election results — all 234 constituencies, winner, margin, vote share |
| `/elections/[id]` | Constituency detail — candidate breakdown, EVM + postal votes |
| `/elections/[id]/booths` | Booth-wise Form 20 data — winner per booth, TVK/DMK/AIADMK bars, margin map |
| `/social` | Reddit pulse — TN politics posts filtered from r/tamilnadu and more, with sentiment |
| `/fact-checks` | Verified claims feed |
| `/forum` | Public discussion |
| `/dashboard` | Auth-protected editor: review crawled articles, manage content |

---

## Architecture

```
Crawlers (Python — run manually or via GitHub Actions)
  ├── crawler/crawl.py              RSS news → Supabase (articles)
  ├── crawler/scrape_elections.py   Form 20 PDFs → election_results
  ├── crawler/scrape_booths.py      Form 20 PDFs → election_booths + booth_results
  ├── crawler/scrape_eci_results.py ECI website → corrects/supplements election_results
  ├── crawler/cleanup_results.py    Deduplicates election_results after scraping
  └── crawler/crawl_reddit.py       Reddit public JSON API → reddit_posts (no API key needed)

pipeline/process.py   LLM article processor (Ollama locally / Claude API in prod)

Supabase (PostgreSQL + RLS + Auth)
  └── election_constituencies, election_results, election_booths,
      election_booth_results, reddit_sources, reddit_posts,
      promises, news_articles, fact_checks, content_drafts

frontend/ (Next.js · Vercel)
```

---

## Folder structure

```
meiporul/
├── crawler/
│   ├── crawl.py                 RSS news crawler
│   ├── scrape_elections.py      Form 20 PDF parser → election results
│   ├── scrape_booths.py         Form 20 PDF parser → per-booth data
│   ├── scrape_eci_results.py    ECI website scraper (Playwright)
│   ├── cleanup_results.py       Post-scrape deduplication + re-ranking
│   └── crawl_reddit.py          Reddit crawler (no credentials needed)
├── pipeline/
│   └── process.py               LLM article analysis
├── supabase/
│   └── migrations/              DB schema — apply via Supabase SQL Editor
├── frontend/
│   └── src/app/
│       ├── elections/           Election pages
│       ├── social/              Reddit feed + sentiment
│       ├── promises/
│       ├── fact-checks/
│       └── forum/
├── .env.example
└── requirements.txt
```

---

## Local setup

### Prerequisites
- Python 3.12+, Node.js 20+
- [Ollama](https://ollama.ai) with `gemma3` pulled — for local AI processing
- Supabase project (free tier works)
- Playwright: `playwright install chromium` — only for ECI scraper

### 1 — Clone and install

```bash
git clone https://github.com/meiiporulprod/meiporul.git
cd meiporul

# Python env
python -m venv meiporul
meiporul\Scripts\activate        # Windows
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### 2 — Environment

```bash
cp .env.example .env              # fill in SUPABASE_URL + SERVICE_ROLE_KEY
cp frontend/.env.example frontend/.env.local   # fill in public Supabase keys
```

### 3 — Database

Apply all migrations in `supabase/migrations/` via **Supabase SQL Editor** (in order):
```
20260515_elections.sql
20260516_booths.sql
20260517_reddit.sql
```

### 4 — Run locally

```bash
# News crawler
python crawler/crawl.py

# Election results (Form 20 PDFs from TN elections site)
python crawler/scrape_elections.py

# Booth-wise data
python crawler/scrape_booths.py

# Fix garbled names using ECI website (opens browser)
python crawler/scrape_eci_results.py

# Deduplicate after ECI scrape
python crawler/cleanup_results.py

# Reddit social feed (no API key needed)
python crawler/crawl_reddit.py --mode hot --limit 100

# Frontend
cd frontend && npm run dev
```

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `SUPABASE_URL` | `.env` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` | Service role key (server-only) |
| `USE_CLAUDE` | `.env` | `true` = Claude API, `false` = Ollama |
| `AI_MODEL` | `.env` | `gemma3` or `claude-sonnet-4-6` |
| `ANTHROPIC_API_KEY` | `.env` | Only when `USE_CLAUDE=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` | Public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | Anon key (RLS-protected) |

---

## Crawler reference

### Reddit (`crawl_reddit.py`)
No API key required — uses Reddit's public JSON endpoints.

```bash
python crawler/crawl_reddit.py                          # crawl all active subreddits
python crawler/crawl_reddit.py --subreddit tamilnadu    # single subreddit
python crawler/crawl_reddit.py --mode hot --limit 100   # hot posts, 100 limit
python crawler/crawl_reddit.py --add-sub chennai "Chennai city"
python crawler/crawl_reddit.py --remove-sub TVKFails
python crawler/crawl_reddit.py --list-subs
python crawler/crawl_reddit.py --cleanup 90             # delete posts >90 days
```

Default subreddits: `tamilnadu`, `india`, `IndiaPolitics`, `southindia`, `TVKFails`, `kollywood`, `chennaicity`

### Election results (`scrape_eci_results.py`)
```bash
python crawler/scrape_eci_results.py              # all 234 ACs
python crawler/scrape_eci_results.py --only 16,28,74   # specific ACs only
```

### Booth data (`scrape_booths.py`)
```bash
python crawler/scrape_booths.py
python crawler/scrape_booths.py --only 1,2,3
python crawler/scrape_booths.py --save-failed    # save failed PDFs for debug
```

---

## Deployment

### Frontend → Vercel
1. Import repo at [vercel.com/new](https://vercel.com/new), set Root Directory to `frontend`
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Crawlers → GitHub Actions
Configured in `.github/workflows/crawl.yml` (news crawler runs every 4h).

Add GitHub secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optionally `ANTHROPIC_API_KEY`.

---

## Data sources

| Source | Type | Notes |
|---|---|---|
| TN Elections Dept | Form 20 PDFs | Booth-wise + constituency totals |
| Election Commission of India | HTML tables | Authoritative candidate results |
| Reddit (public JSON) | Social | r/tamilnadu and 6 others — no auth |
| The Hindu / TNM / Dinamalar | RSS | News articles |

---

## License

Independent, non-partisan. Not affiliated with any political party.
