import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import { notFound } from "next/navigation";
import ReportButton from "./ReportButton";

export const revalidate = 0;

const VERDICT_STYLE: Record<string, { label: string; cls: string; border: string }> = {
  true:       { label: "True",        cls: "bg-green-900/40 text-green-300",   border: "border-green-800" },
  false:      { label: "False",       cls: "bg-red-900/40 text-red-300",       border: "border-red-800"   },
  misleading: { label: "Misleading",  cls: "bg-orange-900/40 text-orange-300", border: "border-orange-800"},
  unverified: { label: "Unverified",  cls: "bg-slate-700 text-slate-300",      border: "border-slate-600" },
  satire:     { label: "Satire",      cls: "bg-purple-900/40 text-purple-300", border: "border-purple-800"},
};

const PLATFORM_URLS: Record<string, (h: string) => string> = {
  twitter:   (h) => `https://x.com/${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  facebook:  (h) => `https://facebook.com/${h}`,
  youtube:   (h) => `https://youtube.com/@${h}`,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: { user } }] = await Promise.all([
    supabase.from("forum_posts_view").select("*").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!post) notFound();

  // Check if current user has already done the reported_id action
  let userReported = false;
  if (user) {
    const { data } = await supabase
      .from("forum_actions")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .eq("action_type", "reported_id")
      .maybeSingle();
    userReported = !!data;
  }

  const verdict = post.ai_verdict_label ? VERDICT_STYLE[post.ai_verdict_label] ?? VERDICT_STYLE.unverified : null;

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <a href="/forum" className="text-sm text-slate-400 hover:text-white transition-colors mb-8 block">
          ← Back to forum
        </a>

        {/* ─── FAKE NEWS POST ─── */}
        {post.tab === "fake_news" && (
          <>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl font-bold leading-snug">{post.title}</h1>
              {verdict ? (
                <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wide ${verdict.cls} ${verdict.border}`}>
                  {verdict.label}
                </span>
              ) : (
                <span className="shrink-0 text-xs px-3 py-1 rounded-full border bg-slate-800 text-slate-400 border-slate-700 animate-pulse">
                  AI checking…
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Posted by @{post.username} · {timeAgo(post.created_at)}
              {post.status === "verified_fake" && (
                <span className="ml-2 text-red-500 font-semibold">· Verified Fake</span>
              )}
            </p>

            {/* Original claim box */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Claimed / Forwarded</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              {post.source_url && (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2 block truncate"
                >
                  Source →
                </a>
              )}
            </div>

            {/* AI fact-check results */}
            {post.ai_verdict && (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 border ${verdict?.border ?? "border-slate-700"}`}
                     style={{ background: "rgba(15,23,42,0.8)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    Fact Check
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed">{post.ai_verdict}</p>
                </div>

                {post.ai_party_response && (
                  <div className="rounded-xl p-4 border border-red-900/50 bg-red-950/20">
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-2">
                      DMK / TVK Perspective
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{post.ai_party_response}</p>
                  </div>
                )}
              </div>
            )}

            {!post.ai_verdict && (
              <div className="text-center py-10 text-slate-500 border border-slate-800 rounded-xl">
                <p className="text-sm">AI fact-check in progress…</p>
                <p className="text-xs mt-1">Refresh in a few seconds</p>
              </div>
            )}
          </>
        )}

        {/* ─── REPORT ID POST ─── */}
        {post.tab === "report_id" && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{
                  post.platform === "twitter" ? "𝕏"
                  : post.platform === "instagram" ? "📸"
                  : post.platform === "facebook" ? "f"
                  : "🔗"
                }</span>
                <h1 className="text-xl font-bold">
                  {post.handle ? `@${post.handle}` : post.title}
                </h1>
                {post.status === "resolved" && (
                  <span className="text-xs bg-green-900/40 text-green-300 border border-green-800 px-2 py-0.5 rounded-full">
                    Resolved
                  </span>
                )}
              </div>
              <h2 className="text-slate-400 text-sm">{post.title}</h2>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Flagged by @{post.username} · {timeAgo(post.created_at)}
            </p>

            {/* Profile link */}
            {post.handle && post.platform && PLATFORM_URLS[post.platform] && (
              <a
                href={PLATFORM_URLS[post.platform](post.handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-colors mb-6"
              >
                Go to @{post.handle} profile →
              </a>
            )}

            {/* Evidence */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Evidence / Reason</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>

            {/* Report counter + action */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{post.report_action_count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    community member{post.report_action_count !== 1 ? "s" : ""} reported this account
                  </p>
                </div>
                {post.status !== "resolved" && (
                  <ReportButton
                    postId={post.id}
                    initialReported={userReported}
                    isLoggedIn={!!user}
                  />
                )}
                {post.status === "resolved" && (
                  <span className="text-sm text-green-400 font-semibold">✓ Resolved by admin</span>
                )}
              </div>

              {!user && (
                <p className="mt-3 text-xs text-slate-500">
                  <a href="/login" className="text-slate-300 hover:text-white underline">Sign in</a> to mark that you reported this account.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
