import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";

export const revalidate = 0;

const VERDICT_STYLES: Record<string, { label: string; cls: string }> = {
  true:        { label: "True",        cls: "bg-green-900/40 text-green-300 border-green-800" },
  false:       { label: "False",       cls: "bg-red-900/40 text-red-300 border-red-800" },
  misleading:  { label: "Misleading",  cls: "bg-orange-900/40 text-orange-300 border-orange-800" },
  unverified:  { label: "Unverified",  cls: "bg-slate-700 text-slate-300 border-slate-600" },
  satire:      { label: "Satire",      cls: "bg-purple-900/40 text-purple-300 border-purple-800" },
};

export default async function FactChecksPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("forum_posts_view")
    .select("id, title, content, ai_verdict, ai_verdict_label, ai_party_response, status, username, created_at")
    .eq("tab", "fake_news")
    .in("status", ["ai_checked", "verified_fake"])
    .not("ai_verdict_label", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const factChecks = posts ?? [];

  const counts = factChecks.reduce<Record<string, number>>((acc, f) => {
    if (f.ai_verdict_label) acc[f.ai_verdict_label] = (acc[f.ai_verdict_label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Fact Checks</h1>
        <p className="text-slate-400 mb-8">
          Claims submitted by the community — AI-verified against documented evidence.
        </p>

        {/* Summary bar */}
        {factChecks.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {Object.entries(VERDICT_STYLES).map(([verdict, { label, cls }]) =>
              counts[verdict] ? (
                <span key={verdict} className={`text-xs px-3 py-1.5 rounded-full border ${cls}`}>
                  {counts[verdict]} {label}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {factChecks.map((f) => {
            const verdict = VERDICT_STYLES[f.ai_verdict_label] ?? VERDICT_STYLES.unverified;
            return (
              <Link
                key={f.id}
                href={`/forum/${f.id}`}
                className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-semibold leading-relaxed text-white group-hover:text-slate-100">
                    {f.title}
                  </p>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${verdict.cls}`}>
                    {verdict.label}
                  </span>
                </div>

                {f.ai_verdict && (
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">{f.ai_verdict}</p>
                )}

                {f.ai_party_response && (
                  <div className="border-l-2 border-red-800 pl-3 mb-3">
                    <p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-1">DMK / TVK Perspective</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.ai_party_response}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {new Date(f.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                  {f.status === "verified_fake" && (
                    <span className="text-red-500 font-semibold">Verified Fake</span>
                  )}
                  <span className="ml-auto">View details →</span>
                </div>
              </Link>
            );
          })}

          {factChecks.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg mb-2">No fact-checks yet.</p>
              <p className="text-sm">
                <Link href="/forum/new?tab=fake_news" className="text-red-400 hover:text-red-300">
                  Submit a claim
                </Link>{" "}
                to the forum — AI will fact-check it and it will appear here.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
