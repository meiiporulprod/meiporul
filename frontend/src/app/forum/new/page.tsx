"use client";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
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
    <main className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <a href="/forum" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to forum
        </a>
      </div>
      <h1 className="text-xl font-bold mb-6">New Post</h1>

      {/* Tab selector */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
        {(["fake_news", "report_id"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
              tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "fake_news" ? "Fake News" : "Report ID"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {tab === "fake_news" && (
          <>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Claim / Headline <span className="text-slate-600">(what is being falsely claimed?)</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="e.g. DMK promised to waive all loans within 100 days"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Full content <span className="text-slate-600">— paste the fake news text or WhatsApp forward here</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                placeholder="Paste the full text of the fake news, WhatsApp message, or misleading post here…"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500 resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Source URL <span className="text-slate-600">(optional — link to the original post)</span>
              </label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                type="url"
                placeholder="https://twitter.com/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
              />
            </div>
            <p className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3">
              Our AI will automatically fact-check this claim and provide a neutral analysis plus the DMK/TVK party perspective.
            </p>
          </>
        )}

        {tab === "report_id" && (
          <>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">Platform</label>
              <div className="flex gap-2">
                {(["twitter", "instagram", "facebook", "youtube"] as Platform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                      platform === p
                        ? "bg-slate-700 border-slate-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {p === "twitter" ? "𝕏 Twitter" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Username / Handle
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <span className="px-3 text-slate-500 text-sm">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                  required
                  placeholder="username"
                  className="flex-1 bg-transparent px-1 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Title <span className="text-slate-600">(why this account should be reported)</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="e.g. Spreading AIADMK fake exit poll results"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Evidence / Description
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                placeholder="Describe what this account is doing — screenshots, specific posts, pattern of behavior…"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500 resize-none"
              />
            </div>
            <p className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3">
              Once posted, community members will be notified to report this account. An admin will review and mark it resolved once action is taken.
            </p>
          </>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading
            ? tab === "fake_news" ? "Posting & fact-checking…" : "Posting…"
            : "Submit post"}
        </button>
      </form>
    </main>
  );
}

export default function NewPostPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-20 text-center text-slate-500">Loading…</div>}>
        <NewPostForm />
      </Suspense>
    </>
  );
}
