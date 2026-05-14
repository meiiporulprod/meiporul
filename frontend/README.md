# Meiporul — Frontend

Next.js 16 app (App Router, Turbopack). Public promise tracker + auth-protected editor dashboard.

## Routes

| Path | Type | Description |
|---|---|---|
| `/` | public | Home — stats overview + broken promises highlight |
| `/promises` | public | Full promise tracker with filters, search, category cards |
| `/fact-checks` | public | Verified fact-checks feed |
| `/login` | public | Supabase email/password login |
| `/dashboard` | protected | Article review, promise management, content drafts |

## Dev

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build check
```

Requires `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deploy to Vercel

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** → `frontend`
3. Add the two `NEXT_PUBLIC_*` env vars
4. Deploy — Vercel auto-deploys on every push to `main`

## Stack

- Next.js 16.2 · App Router · Turbopack
- Tailwind CSS v4 + CSS Modules (custom dark theme)
- Supabase (`@supabase/ssr` for server + client)
- Fonts: Bebas Neue, DM Sans, DM Mono (Google Fonts)
