"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const VERDICT_STYLE: Record<string, { label: string; cls: string; gradient: string }> = {
  true:       { label: "True",        cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", gradient: "from-emerald-500/20 to-transparent" },
  false:      { label: "False",       cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", gradient: "from-rose-500/20 to-transparent" },
  misleading: { label: "Misleading",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", gradient: "from-amber-500/20 to-transparent" },
  unverified: { label: "Unverified",  cls: "bg-slate-500/10 text-slate-400 border-slate-500/20", gradient: "from-slate-500/20 to-transparent" },
  satire:     { label: "Satire",      cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", gradient: "from-purple-500/20 to-transparent" },
};

const PLATFORM_ICON: Record<string, string> = {
  twitter:   "𝕏",
  instagram: "📸",
  facebook:  "f",
  youtube:   "▶",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function ForumClient({
  initialTab,
  fakePosts,
  reportPosts,
}: {
  initialTab: string;
  fakePosts: any[];
  reportPosts: any[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab === "report_id" ? "report_id" : "fake_news");

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    router.replace(`/forum?tab=${newTab}`, { scroll: false });
  };

  return (
    <div className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-10">
        <header className="text-center md:text-left">
          <h1 className="font-['Bebas_Neue'] text-5xl sm:text-6xl md:text-7xl leading-[1.1] tracking-wide text-slate-100 mb-2 drop-shadow-sm">
            COMMUNITY FORUM
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed font-light">
            Report fake news · Flag abusive social media accounts
          </p>
        </header>
        
        <Link
          href="/forum/new"
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-sm font-bold tracking-widest uppercase px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:-translate-y-0.5 border border-red-500/50"
        >
          <span className="text-lg leading-none">+</span> New Post
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl mb-10 shadow-inner relative z-10">
        {[
          { key: "fake_news", label: "Fake News Tracking" },
          { key: "report_id", label: "Account Moderation" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex-1 text-center text-xs sm:text-sm font-bold tracking-widest uppercase py-3 px-2 rounded-xl transition-all duration-300 ${
              tab === key
                ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── FAKE NEWS TAB ─── */}
      {tab === "fake_news" && (
        <div className="space-y-4 relative z-10">
          {fakePosts.length === 0 && (
            <div className="text-center py-24 bg-slate-900/20 backdrop-blur-md border border-slate-800/50 border-dashed rounded-3xl">
              <p className="text-xl font-semibold text-slate-300 mb-2">No fake news reports yet.</p>
              <p className="text-sm text-slate-500">
                Be the first —{" "}
                <Link href="/forum/new?tab=fake_news" className="text-red-400 hover:text-red-300 font-medium underline underline-offset-2">
                  post a claim to fact-check
                </Link>
              </p>
            </div>
          )}
          {fakePosts.map((p) => {
            const verdict = p.ai_verdict_label
              ? (VERDICT_STYLE[p.ai_verdict_label] ?? VERDICT_STYLE.unverified)
              : null;
            return (
              <Link
                key={p.id}
                href={`/forum/${p.id}`}
                className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
              >
                {verdict && (
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${verdict.gradient} opacity-50 group-hover:opacity-100`} />
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                  <p className="text-base sm:text-lg font-semibold text-slate-200 group-hover:text-white leading-snug line-clamp-2 pr-4 flex-1 transition-colors">
                    {p.title}
                  </p>
                  {verdict ? (
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border backdrop-blur-sm ${verdict.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse`} />
                      {verdict.label}
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border bg-slate-800 text-slate-400 border-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 animate-pulse" />
                      Checking…
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4 font-light">{p.content}</p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-3 border-t border-slate-800/60">
                  <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded">@{p.username}</span>
                  <span>{timeAgo(p.created_at)}</span>
                  {p.status === "verified_fake" && (
                    <span className="text-rose-500 font-semibold ml-auto px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10">Verified Fake</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── REPORT ID TAB ─── */}
      {tab === "report_id" && (
        <div className="space-y-4 relative z-10">
          {reportPosts.length === 0 && (
            <div className="text-center py-24 bg-slate-900/20 backdrop-blur-md border border-slate-800/50 border-dashed rounded-3xl">
              <p className="text-xl font-semibold text-slate-300 mb-2">No IDs flagged yet.</p>
              <p className="text-sm text-slate-500">
                <Link href="/forum/new?tab=report_id" className="text-red-400 hover:text-red-300 font-medium underline underline-offset-2">
                  Flag a Twitter/Instagram account
                </Link>{" "}
                for the community to mass-report.
              </p>
            </div>
          )}
          {reportPosts.map((p) => (
            <Link
              key={p.id}
              href={`/forum/${p.id}`}
              className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-1 h-full bg-slate-700 group-hover:bg-red-500 transition-colors" />

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {p.platform && (
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-lg shrink-0">
                      {PLATFORM_ICON[p.platform] ?? "🔗"}
                    </span>
                  )}
                  <span className="text-base sm:text-lg font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                    {p.handle ? `@${p.handle}` : p.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === "resolved" ? (
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                      Resolved
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-md">
                      {p.report_action_count} reported
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4 font-light">{p.content}</p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-3 border-t border-slate-800/60">
                <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded">@{p.username}</span>
                <span>{timeAgo(p.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
