import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";

export const revalidate = 0;

const VERDICT_STYLE: Record<string, { label: string; cls: string }> = {
  true:       { label: "True",        cls: "bg-green-900/40 text-green-300 border-green-800" },
  false:      { label: "False",       cls: "bg-red-900/40 text-red-300 border-red-800" },
  misleading: { label: "Misleading",  cls: "bg-orange-900/40 text-orange-300 border-orange-800" },
  unverified: { label: "Unverified",  cls: "bg-slate-700 text-slate-300 border-slate-600" },
  satire:     { label: "Satire",      cls: "bg-purple-900/40 text-purple-300 border-purple-800" },
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

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "fake_news" } = await searchParams;
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("forum_posts_view")
    .select("*")
    .eq("tab", tab)
    .order("created_at", { ascending: false })
    .limit(50);

  const fakePosts = tab === "fake_news" ? (posts ?? []) : [];
  const reportPosts = tab === "report_id" ? (posts ?? []) : [];

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Community Forum</h1>
            <p className="text-slate-400 text-sm">
              Report fake news · Flag abusive social media accounts
            </p>
          </div>
          <Link
            href="/forum/new"
            className="shrink-0 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Post
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
          {[
            { key: "fake_news", label: "Fake News" },
            { key: "report_id", label: "Report IDs" },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={`/forum?tab=${key}`}
              className={`flex-1 text-center text-sm py-1.5 rounded-lg font-medium transition-colors ${
                tab === key
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ─── FAKE NEWS TAB ─── */}
        {tab === "fake_news" && (
          <div className="space-y-3">
            {fakePosts.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg mb-2">No fake news reports yet.</p>
                <p className="text-sm">
                  Be the first —{" "}
                  <Link href="/forum/new?tab=fake_news" className="text-red-400 hover:text-red-300">
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
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white leading-snug line-clamp-2">
                      {p.title}
                    </p>
                    {verdict ? (
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${verdict.cls}`}>
                        {verdict.label}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border bg-slate-800 text-slate-500 border-slate-700">
                        Checking…
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>@{p.username}</span>
                    <span>{timeAgo(p.created_at)}</span>
                    {p.status === "verified_fake" && (
                      <span className="text-red-500 font-semibold">Verified Fake</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ─── REPORT ID TAB ─── */}
        {tab === "report_id" && (
          <div className="space-y-3">
            {reportPosts.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg mb-2">No IDs flagged yet.</p>
                <p className="text-sm">
                  <Link href="/forum/new?tab=report_id" className="text-red-400 hover:text-red-300">
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
                className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.platform && (
                      <span className="text-slate-400 text-base shrink-0">
                        {PLATFORM_ICON[p.platform] ?? "🔗"}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                      {p.handle ? `@${p.handle}` : p.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === "resolved" ? (
                      <span className="text-xs bg-green-900/40 text-green-300 border border-green-800 px-2 py-0.5 rounded-full">
                        Resolved
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                        {p.report_action_count} reported
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.content}</p>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>@{p.username}</span>
                  <span>{timeAgo(p.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
