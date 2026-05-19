"use client";

import { useState, useMemo } from "react";
import type { RedditPost, SubSource, PartyTally } from "./page";

const PARTY_COLORS: Record<string, string> = {
  TVK:    "#E8411B",
  DMK:    "#E80000",
  AIADMK: "#006400",
  BJP:    "#FF9933",
  INC:    "#19AAED",
  NTK:    "#FF4500",
  PMK:    "#FF6600",
  VCK:    "#0000CD",
  DMDK:   "#8B0000",
  MDMK:   "#800080",
};

const SENTIMENT_STYLE = {
  positive: { dot: "bg-emerald-500", badge: "bg-emerald-900/40 text-emerald-400", label: "Positive" },
  negative: { dot: "bg-red-500",     badge: "bg-red-900/40 text-red-400",         label: "Negative" },
  neutral:  { dot: "bg-slate-500",   badge: "bg-slate-800 text-slate-400",         label: "Neutral"  },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type SentimentFilter = "all" | "positive" | "negative" | "neutral";

export default function SocialClient({
  posts,
  sources,
  partyTally,
}: {
  posts: RedditPost[];
  sources: SubSource[];
  partyTally: PartyTally[];
}) {
  const [subFilter,       setSubFilter]       = useState<string>("all");
  const [partyFilter,     setPartyFilter]     = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [search,          setSearch]          = useState("");

  const subreddits = useMemo(() => ["all", ...sources.map((s) => s.subreddit)], [sources]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (subFilter !== "all" && p.subreddit !== subFilter) return false;
      if (partyFilter !== "all" && !p.party_mentions.includes(partyFilter)) return false;
      if (sentimentFilter !== "all" && p.sentiment_label !== sentimentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.author.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [posts, subFilter, partyFilter, sentimentFilter, search]);

  const maxMentions = partyTally[0]?.total ?? 1;

  return (
    <div className="space-y-8">

      {/* 7-day party tally */}
      {partyTally.length > 0 && (
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">
            Party Mentions — Last 7 Days
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {partyTally.slice(0, 8).map((t) => {
              const color = PARTY_COLORS[t.party] ?? "#6B7280";
              const pct   = Math.round((t.positive / (t.total || 1)) * 100);
              return (
                <button
                  key={t.party}
                  onClick={() => setPartyFilter(partyFilter === t.party ? "all" : t.party)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    partyFilter === t.party
                      ? "border-slate-400 bg-slate-800"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{ color }}>{t.party}</span>
                    <span className="text-xs text-slate-400">{t.total}</span>
                  </div>
                  {/* Sentiment bar */}
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{pct}% positive</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
        />

        {/* Subreddit chips */}
        <div className="flex flex-wrap gap-1.5">
          {subreddits.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubFilter(sub)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                subFilter === sub
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {sub === "all" ? "All subs" : `r/${sub}`}
            </button>
          ))}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-1.5">
          {(["all", "positive", "negative", "neutral"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSentimentFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                sentimentFilter === s
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {s === "all" ? "All sentiment" : s}
            </button>
          ))}
        </div>
      </section>

      {/* Post count */}
      <p className="text-xs text-slate-500">
        {filtered.length} post{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== posts.length && ` (of ${posts.length})`}
      </p>

      {/* Posts */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No posts match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => {
            const sent = SENTIMENT_STYLE[post.sentiment_label] ?? SENTIMENT_STYLE.neutral;
            return (
              <a
                key={post.post_id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900 transition-colors"
              >
                {/* Top row: Reddit attribution + subreddit + sentiment + time */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Reddit attribution — required by Reddit's Responsible Builder Policy */}
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg className="w-3 h-3 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="10" cy="10" r="10" />
                      <path fill="white" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .13-.52l-2.38-.5a.25.25 0 0 0-.3.19l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.65a3.57 3.57 0 0 1-2.85.86 3.57 3.57 0 0 1-2.85-.86.23.23 0 0 1 .33-.33 3.15 3.15 0 0 0 2.52.71 3.15 3.15 0 0 0 2.52-.71.23.23 0 0 1 .33.33zm-.17-1.65a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>
                    </svg>
                    Reddit
                  </span>
                  <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    r/{post.subreddit}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${sent.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${sent.dot}`} />
                    {sent.label}
                  </span>
                  {post.party_mentions.map((p) => (
                    <span
                      key={p}
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ color: PARTY_COLORS[p] ?? "#9CA3AF", background: "#1e293b" }}
                    >
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-slate-500 ml-auto">
                    {timeAgo(post.created_utc)}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm text-slate-100 leading-snug line-clamp-2">{post.title}</p>

                {/* Bottom row: author + score + comments */}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>u/{post.author}</span>
                  <span>▲ {post.score.toLocaleString()}</span>
                  <span>💬 {post.num_comments.toLocaleString()}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
