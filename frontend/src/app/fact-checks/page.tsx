import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

const VERDICT_STYLES: Record<string, { label: string; cls: string; gradient: string }> = {
  true:        { label: "True",        cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", gradient: "from-emerald-500/20 to-transparent" },
  false:       { label: "False",       cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", gradient: "from-rose-500/20 to-transparent" },
  misleading:  { label: "Misleading",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", gradient: "from-amber-500/20 to-transparent" },
  unverified:  { label: "Unverified",  cls: "bg-slate-500/10 text-slate-400 border-slate-500/20", gradient: "from-slate-500/20 to-transparent" },
  satire:      { label: "Satire",      cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", gradient: "from-purple-500/20 to-transparent" },
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
    <div className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <header className="mb-12 text-center md:text-left">
        <h1 className="font-['Bebas_Neue'] text-5xl sm:text-6xl md:text-7xl leading-[1.1] tracking-wide text-slate-100 mb-4 drop-shadow-sm">
          FACT CHECKS
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed font-light max-w-2xl">
          Claims submitted by the community — AI-verified against documented evidence.
        </p>
      </header>

      {/* Summary bar */}
      {factChecks.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-10 relative z-10">
          <span className="text-xs font-mono text-slate-500 tracking-widest uppercase mr-2">Overview:</span>
          {Object.entries(VERDICT_STYLES).map(([verdict, { label, cls }]) =>
            counts[verdict] ? (
              <span key={verdict} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border backdrop-blur-sm shadow-sm ${cls}`}>
                <span className="text-lg font-black">{counts[verdict]}</span> {label}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-6 relative z-10">
        {factChecks.map((f) => {
          const verdict = VERDICT_STYLES[f.ai_verdict_label] ?? VERDICT_STYLES.unverified;
          return (
            <Link
              key={f.id}
              href={`/forum/${f.id}`}
              className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:bg-slate-800/60 hover:border-slate-700 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${verdict.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-slate-200 group-hover:text-white transition-colors flex-1 pr-4">
                  {f.title}
                </h2>
                <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase border backdrop-blur-sm ${verdict.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse`} />
                  {verdict.label}
                </span>
              </div>

              {f.ai_verdict && (
                <p className="text-slate-300 leading-relaxed mb-6 font-light">{f.ai_verdict}</p>
              )}

              {f.ai_party_response && (
                <div className="bg-slate-950/50 border border-slate-800/80 shadow-inner rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                    <p className="text-[10px] text-rose-400 font-mono uppercase tracking-widest font-semibold">DMK / TVK Perspective</p>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed pl-3.5">{f.ai_party_response}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <span>
                    {new Date(f.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                  {f.status === "verified_fake" && (
                    <span className="px-2 py-0.5 rounded border border-rose-500/30 text-rose-500 bg-rose-500/10">Verified Fake</span>
                  )}
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-slate-400 group-hover:text-white transition-colors flex items-center gap-1">
                  View details
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </Link>
          );
        })}

        {factChecks.length === 0 && (
          <div className="text-center py-24 bg-slate-900/20 backdrop-blur-md border border-slate-800/50 border-dashed rounded-3xl relative z-10">
            <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-lg text-slate-300 mb-2 font-semibold">No fact-checks yet.</p>
            <p className="text-sm text-slate-500">
              <Link href="/forum/new?tab=fake_news" className="text-red-400 hover:text-red-300 font-medium underline underline-offset-2">
                Submit a claim
              </Link>{" "}
              to the forum — AI will fact-check it and it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
