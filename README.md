# மெய்பொருள் · Meiporul

Tamil Nadu political accountability platform. Tracks promises made by TVK/Vijay and other parties — every promise documented, verified, and updated as evidence emerges.

**Live:** [meiporul.in](https://meiporul.in) *(deploy to activate)*

---

## What it does

- **Public tracker** — `/promises` shows all manifesto promises with status (pending / in progress / fulfilled / broken), evidence, and progress stats
- **Fact-check feed** — `/fact-checks` for verified claims
- **Editor dashboard** — `/dashboard` (auth-protected) for reviewing crawled articles and managing content
- **Automated crawling** — GitHub Actions pulls news every 4 hours from The Hindu, TNM, Dinamalar
- **AI pipeline** — summarises articles in English + Tamil, tags relevance, drafts social content (Ollama locally / Claude API in production)

---

## Architecture

```
GitHub Actions (cron every 4h)
  └─ crawler/crawl.py      → scrapes RSS feeds → Supabase
  └─ pipeline/process.py   → LLM analysis      → Supabase

Supabase (PostgreSQL + Auth)
  └─ promises, news_articles, fact_checks, content_drafts

frontend/ (Next.js 16 · Vercel)
  └─ public routes: /, /promises, /fact-checks
  └─ protected:     /dashboard/*
```

---

## Folder structure

```
meiporul/
├── crawler/          # RSS news crawler (Python)
│   ├── crawl.py
│   └── sources.py
├── pipeline/         # LLM article processor (Python)
│   └── process.py
├── supabase/
│   ├── migrations/   # DB schema (apply once via Supabase CLI)
│   └── seeds/        # Seed data (TVK promises)
├── frontend/         # Next.js app
│   └── src/
│       ├── app/      # App Router pages
│       ├── components/
│       └── lib/      # Supabase clients + types
├── .github/workflows/crawl.yml   # Automated crawler + pipeline
├── .env.example
└── requirements.txt
```

---

## Local setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- [Ollama](https://ollama.ai) with `gemma3` pulled (`ollama pull gemma3`)
- Supabase project (free tier works)

### 1 — Clone and install

```bash
git clone https://github.com/meiiporulprod/meiporul.git
cd meiporul

# Python deps
python -m venv meiporul
meiporul\Scripts\activate      # Windows
pip install -r requirements.txt

# Frontend deps
cd frontend && npm install
```

### 2 — Environment variables

```bash
# Root — copy and fill in
cp .env.example .env

# Frontend
cp frontend/.env.example frontend/.env.local
```

See `.env.example` for all required variables.

### 3 — Database

Apply migrations (one-time):
```bash
npx supabase db push --project-ref <your-project-ref>
```

Seed TVK promises:
```bash
# Paste supabase/seeds/001_tvk_promises.sql into Supabase SQL Editor and run
```

### 4 — Run locally

```bash
# Crawler
python crawler/crawl.py

# Pipeline (requires Ollama running)
python pipeline/process.py

# Frontend
cd frontend && npm run dev
```

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `SUPABASE_URL` | `.env` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` | Service role key (server-only, never expose) |
| `USE_CLAUDE` | `.env` | `true` to use Claude API, `false` for Ollama |
| `AI_MODEL` | `.env` | Model name (`gemma3` or `claude-sonnet-4-6`) |
| `ANTHROPIC_API_KEY` | `.env` | Required only when `USE_CLAUDE=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` | Same Supabase URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | Anon key (public, RLS-protected) |

---

## Deployment

See [Deployment](#deploy) section below — frontend → Vercel, crawler → GitHub Actions.

---

## Deploy

### Frontend → Vercel

1. Push repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import repo
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

### Crawler → GitHub Actions

Already configured in `.github/workflows/crawl.yml` (runs every 4 hours).

Add secrets in GitHub → Settings → Secrets and variables → Actions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

To use Claude API in Actions instead of Ollama, also add:
- `ANTHROPIC_API_KEY`
- Set `USE_CLAUDE=true` in the workflow env

---

## Data sources

| Source | Feed | Notes |
|---|---|---|
| The Hindu | `thehindu.com/news/national/tamil-nadu/feeder/default.rss` | Primary English source |
| The News Minute | `thenewsminute.com/feed` | TN-focused English |
| Dinamalar | `dinamalar.com/rssfeed.asp` | Tamil daily |
| TVK Manifesto | `tvk.org.in/manifesto` | 40-point seed data |

---

## License

Independent, non-partisan. Not affiliated with any political party.
