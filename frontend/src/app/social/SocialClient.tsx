"use client";

import { useState, useMemo } from "react";
import type { RedditPost, SubSource, PartyTally, MonitoredPost, CommunityNote } from "./page";
import CommunityNoteModal from "./CommunityNoteModal";

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

function PartyChip({ party }: { party: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{ color: PARTY_COLORS[party] ?? "#9CA3AF", background: "#1e293b" }}
    >
      {party}
    </span>
  );
}

// ── Twitter/X icon ─────────────────────────────────────────────────────────
function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 1227" fill="currentColor">
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z" />
    </svg>
  );
}

// ── Instagram icon ──────────────────────────────────────────────────────────
function InstaIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

type Tab = "reddit" | "twitter" | "instagram";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

export default function SocialClient({
  posts,
  sources,
  partyTally,
  monitoredPosts,
  communityNotes,
}: {
  posts: RedditPost[];
  sources: SubSource[];
  partyTally: PartyTally[];
  monitoredPosts: MonitoredPost[];
  communityNotes: CommunityNote[];
}) {
  const [tab,             setTab]             = useState<Tab>("reddit");
  const [subFilter,       setSubFilter]       = useState("all");
  const [partyFilter,     setPartyFilter]     = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [search,          setSearch]          = useState("");
  const [expandedNotes,   setExpandedNotes]   = useState<Set<string>>(new Set());
  const [noteModalUrl,    setNoteModalUrl]     = useState<string | null>(null);

  const subreddits = useMemo(() => ["all", ...sources.map((s) => s.subreddit)], [sources]);

  // Build notes lookup map: tweet_url → notes[]
  const notesMap = useMemo(() => {
    const m = new Map<string, CommunityNote[]>();
    for (const n of communityNotes) {
      if (!m.has(n.tweet_url)) m.set(n.tweet_url, []);
      m.get(n.tweet_url)!.push(n);
    }
    return m;
  }, [communityNotes]);

  const twitterPosts  = useMemo(() => monitoredPosts.filter(p => p.platform === "twitter"),   [monitoredPosts]);
  const instaPosts    = useMemo(() => monitoredPosts.filter(p => p.platform === "instagram"), [monitoredPosts]);

  const filteredReddit = useMemo(() => {
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

  function toggleNotes(postUrl: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(postUrl)) next.delete(postUrl);
      else next.add(postUrl);
      return next;
    });
  }

  const tabClass = (t: Tab) =>
    `flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
      tab === t
        ? "bg-slate-200 text-slate-900"
        : "text-slate-400 hover:text-white"
    }`;

  return (
    <div className="space-y-8">

      {/* Platform tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("reddit")} className={tabClass("reddit")}>
          <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="10"/>
            <path fill="white" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .13-.52l-2.38-.5a.25.25 0 0 0-.3.19l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.65a3.57 3.57 0 0 1-2.85.86 3.57 3.57 0 0 1-2.85-.86.23.23 0 0 1 .33-.33 3.15 3.15 0 0 0 2.52.71 3.15 3.15 0 0 0 2.52-.71.23.23 0 0 1 .33.33zm-.17-1.65a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>
          </svg>
          Reddit
          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{posts.length}</span>
        </button>
        <button onClick={() => setTab("twitter")} className={tabClass("twitter")}>
          <XIcon />
          X / Twitter
          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{twitterPosts.length}</span>
        </button>
        <button onClick={() => setTab("instagram")} className={tabClass("instagram")}>
          <InstaIcon />
          Instagram
          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{instaPosts.length}</span>
        </button>
      </div>

      {/* ── Reddit tab ───────────────────────────────────────────────────────── */}
      {tab === "reddit" && (
        <>
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
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
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
            <input
              type="text"
              placeholder="Search posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
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

          <p className="text-xs text-slate-500">
            {filteredReddit.length} post{filteredReddit.length !== 1 ? "s" : ""}
            {filteredReddit.length !== posts.length && ` (of ${posts.length})`}
          </p>

          {filteredReddit.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No posts match your filters.</div>
          ) : (
            <div className="space-y-2">
              {filteredReddit.map((post) => {
                const sent = SENTIMENT_STYLE[post.sentiment_label] ?? SENTIMENT_STYLE.neutral;
                return (
                  <a
                    key={post.post_id}
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <svg className="w-3 h-3 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                          <circle cx="10" cy="10" r="10"/>
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
                      {post.party_mentions.map((p) => <PartyChip key={p} party={p} />)}
                      <span className="text-xs text-slate-500 ml-auto">{timeAgo(post.created_utc)}</span>
                    </div>
                    <p className="text-sm text-slate-100 leading-snug line-clamp-2">{post.title}</p>
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
        </>
      )}

      {/* ── Twitter tab ──────────────────────────────────────────────────────── */}
      {tab === "twitter" && (
        <>
          <p className="text-xs text-slate-500">
            {twitterPosts.length} tweet{twitterPosts.length !== 1 ? "s" : ""} from monitored TVK accounts
          </p>

          {twitterPosts.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No tweets yet — check back soon.
            </div>
          ) : (
            <div className="space-y-3">
              {twitterPosts.map((post) => {
                const acc   = post.monitored_accounts;
                const notes = notesMap.get(post.url) ?? [];
                const isExpanded = expandedNotes.has(post.url);
                return (
                  <div
                    key={post.id}
                    className="p-4 rounded-lg border border-slate-800 bg-slate-900/40"
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <XIcon className="w-3 h-3" />
                        <span className="text-xs font-medium">@{acc?.handle ?? "unknown"}</span>
                      </span>
                      {acc?.party && <PartyChip party={acc.party} />}
                      {post.posted_at && (
                        <span className="text-xs text-slate-500 ml-auto">
                          {timeAgo(post.posted_at)}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-line line-clamp-4 mb-3">
                      {post.content}
                    </p>

                    {/* Media thumbnails */}
                    {post.media_urls.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {post.media_urls.slice(0, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-20 w-20 object-cover rounded-lg border border-slate-700"
                          />
                        ))}
                      </div>
                    )}

                    {/* Engagement + actions */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {post.likes   > 0 && <span>❤ {post.likes.toLocaleString()}</span>}
                      {post.reposts > 0 && <span>🔁 {post.reposts.toLocaleString()}</span>}
                      {post.replies > 0 && <span>💬 {post.replies.toLocaleString()}</span>}
                      {post.views   > 0 && <span>👁 {post.views.toLocaleString()}</span>}

                      <div className="ml-auto flex items-center gap-2">
                        {notes.length > 0 && (
                          <button
                            onClick={() => toggleNotes(post.url)}
                            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            {notes.length} note{notes.length !== 1 ? "s" : ""} {isExpanded ? "▲" : "▼"}
                          </button>
                        )}
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          View on X ↗
                        </a>
                        <button
                          onClick={() => setNoteModalUrl(post.url)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          + Add note
                        </button>
                      </div>
                    </div>

                    {/* Expanded community notes */}
                    {isExpanded && notes.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                        {notes.map((n) => (
                          <div key={n.id} className="bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
                            <p className="text-xs text-amber-100 leading-relaxed">{n.note_text}</p>
                            <p className="text-[10px] text-amber-700 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Instagram tab ────────────────────────────────────────────────────── */}
      {tab === "instagram" && (
        <>
          <p className="text-xs text-slate-500">
            {instaPosts.length} post{instaPosts.length !== 1 ? "s" : ""} from monitored accounts
          </p>

          {instaPosts.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No posts yet — check back soon.
            </div>
          ) : (
            <div className="space-y-3">
              {instaPosts.map((post) => {
                const acc = post.monitored_accounts;
                return (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900 transition-colors"
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="flex items-center gap-1 text-pink-400">
                        <InstaIcon className="w-3 h-3" />
                        <span className="text-xs font-medium text-slate-300">@{acc?.handle ?? "unknown"}</span>
                      </span>
                      {acc?.party && <PartyChip party={acc.party} />}
                      {post.posted_at && (
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(post.posted_at)}</span>
                      )}
                    </div>

                    {/* Media thumbnails */}
                    {post.media_urls.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {post.media_urls.slice(0, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-24 w-24 object-cover rounded-lg border border-slate-700"
                          />
                        ))}
                        {post.media_urls.length > 3 && (
                          <div className="h-24 w-24 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400 text-sm">
                            +{post.media_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Caption */}
                    {post.content && (
                      <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-3">
                        {post.content}
                      </p>
                    )}

                    {/* Engagement */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {post.likes   > 0 && <span>❤ {post.likes.toLocaleString()}</span>}
                      {post.replies > 0 && <span>💬 {post.replies.toLocaleString()}</span>}
                      {post.views   > 0 && <span>👁 {post.views.toLocaleString()}</span>}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Community note modal */}
      {noteModalUrl && (
        <CommunityNoteModal
          tweetUrl={noteModalUrl}
          onClose={() => setNoteModalUrl(null)}
        />
      )}
    </div>
  );
}
