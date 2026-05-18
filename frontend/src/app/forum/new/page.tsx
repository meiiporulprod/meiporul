"use client";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "fake_news" | "report_id";
type Platform = "twitter" | "instagram" | "facebook" | "youtube";

function NewPostForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "fake_news");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  if (authed === false) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 mb-4">You need to sign in to post.</p>
        <a href="/login" className="bg-white text-slate-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
          Sign in
        </a>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      tab,
      title: title.trim(),
      content: content.trim(),
    };
    if (tab === "fake_news") payload.source_url = sourceUrl.trim() || null;
    if (tab === "report_id") {
      payload.platform = platform;
      payload.handle = handle.replace(/^@/, "").trim();
    }

    const { data: post, error: insertErr } = await supabase
      .from("forum_posts")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr || !post) {
      setError(insertErr?.message ?? "Failed to post.");
      setLoading(false);
      return;
    }

    // Await fact-check so it completes before navigation (avoids cancelled fetch)
    if (tab === "fake_news") {
      await fetch("/api/forum/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, claim: `${title}\n\n${content}` }),
      }).catch(console.error);
    }

    router.push(`/forum/${post.id}`);
  }

  return (
    <>
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <main className="max-w-2xl mx-auto px-4 py-12 relative">
        <div className="mb-8">
          <a href="/forum" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to forum
          </a>
        </div>
        
        <div className="mb-8">
          <h1 className="font-['Bebas_Neue'] text-5xl md:text-6xl tracking-wider mb-2 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-lg">
            SUBMIT REPORT
          </h1>
          <p className="text-slate-400 text-lg font-light">Contribute to the platform by submitting fake news claims for AI fact-checking, or report malicious accounts.</p>
        </div>

        {/* Tab selector */}
        <div className="flex p-1 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl mb-8 shadow-inner">
          {(["fake_news", "report_id"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 text-sm py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                tab === t 
                  ? "bg-slate-800/80 text-white shadow-md border border-slate-700/50" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent"
              }`}
            >
              {t === "fake_news" ? "Fake News Claim" : "Report Account ID"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">

          {tab === "fake_news" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Claim / Headline <span className="text-slate-500 font-normal">(what is being falsely claimed?)</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g. DMK promised to waive all loans within 100 days"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Full content <span className="text-slate-500 font-normal">— paste the fake news text or WhatsApp forward here</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                  placeholder="Paste the full text of the fake news, WhatsApp message, or misleading post here…"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Source URL <span className="text-slate-500 font-normal">(optional — link to the original post)</span>
                </label>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  type="url"
                  placeholder="https://twitter.com/..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                />
              </div>
              <div className="flex items-start gap-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4">
                <div className="mt-0.5 text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className="text-sm text-indigo-200/70 leading-relaxed">
                  Our AI will automatically fact-check this claim and provide a neutral analysis plus perspective from all relevant parties.
                </p>
              </div>
            </>
          )}

          {tab === "report_id" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Platform</label>
                <div className="flex flex-wrap gap-3">
                  {(["twitter", "instagram", "facebook", "youtube"] as Platform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`text-sm px-4 py-2 rounded-lg border font-medium transition-all duration-300 capitalize ${
                        platform === p
                          ? "bg-slate-800 border-slate-600 text-white shadow-md"
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      {p === "twitter" ? "𝕏 Twitter" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Username / Handle
                </label>
                <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600 transition-all shadow-inner">
                  <span className="pl-4 pr-2 text-slate-500 text-sm font-medium">@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                    required
                    placeholder="username"
                    className="flex-1 bg-transparent pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Title <span className="text-slate-500 font-normal">(why this account should be reported)</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g. Spreading fake exit poll results"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Evidence / Description
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe what this account is doing — screenshots, specific posts, pattern of behavior…"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner resize-none"
                />
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                <div className="mt-0.5 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Once posted, community members will be notified to report this account. An admin will review and mark it resolved once action is taken.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-500 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-950/20 backdrop-blur-sm px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                <span className="font-semibold text-white tracking-wide">
                  {loading
                    ? tab === "fake_news" ? "Posting & fact-checking…" : "Posting…"
                    : "Submit Report"}
                </span>
                {!loading && (
                  <svg className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                )}
              </div>
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default function NewPostPage() {
  return (
    <>
      <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-20 text-center text-slate-500">Loading…</div>}>
        <NewPostForm />
      </Suspense>
    </>
  );
}
