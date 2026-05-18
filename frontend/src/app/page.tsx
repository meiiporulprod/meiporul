import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { PromiseStatus } from "@/lib/types";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: rawSummary }, { data: rawRecentPromises }] = await Promise.all([
    supabase.from("promise_summary").select("*"),
    supabase
      .from("promises")
      .select("id, promise_text, category, status, impact_level, made_on")
      .in("status", ["broken", "unclear"])
      .eq("impact_level", "high")
      .order("made_on", { ascending: false })
      .limit(5),
  ]);

  const summary = rawSummary ?? [];
  const recentPromises = rawRecentPromises ?? [];

  const counts = Object.fromEntries(
    (summary ?? []).map((r: { status: string; total: number }) => [r.status, r.total])
  );
  const total = Object.values(counts).reduce((a: number, b) => a + (b as number), 0);
  const fulfilled = counts["fulfilled"] ?? 0;
  const broken = counts["broken"] ?? 0;
  const pct = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  return (
    <>
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <main className="max-w-5xl mx-auto px-4 pb-20 relative">
        
        {/* HERO SECTION */}
        <div className="pt-12 md:pt-20 pb-12 md:pb-16 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/50 text-slate-300 text-xs font-semibold tracking-wide uppercase mb-6 md:mb-8 backdrop-blur-sm shadow-xl">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            Live Political Accountability
          </div>
          <h1 className="font-['Bebas_Neue'] text-5xl sm:text-7xl md:text-8xl tracking-wider mb-4 md:mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-lg leading-[1.1]">
            HOLD TAMIL NADU <br className="hidden sm:block"/> ACCOUNTABLE.
          </h1>
          <p className="text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl font-light leading-relaxed px-4">
            The independent platform tracking every promise made by TVK, DMK, AIADMK and state leaders — verified with indisputable evidence.
          </p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-16 md:mb-24 relative z-10">
          {[
            { label: "Total Promises", value: total, gradient: "from-slate-200 to-slate-500" },
            { label: "Fulfilled", value: fulfilled, gradient: "from-emerald-300 to-emerald-600" },
            { label: "Broken", value: broken, gradient: "from-rose-300 to-rose-600" },
            { label: "Kept Rate", value: `${pct}%`, gradient: pct >= 50 ? "from-emerald-300 to-emerald-600" : "from-rose-300 to-rose-600" },
          ].map(({ label, value, gradient }, i) => (
            <div key={label} className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`text-4xl sm:text-5xl md:text-6xl font-black mb-1 sm:mb-3 bg-gradient-to-br ${gradient} bg-clip-text text-transparent drop-shadow-sm tracking-tight`}>
                {value}
              </div>
              <div className="text-xs sm:text-sm md:text-base font-semibold text-slate-400 tracking-wide uppercase leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* RECENT PROMISES LIST */}
        {recentPromises && recentPromises.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-rose-500/20 animate-pulse" />
                <span className="w-3 h-3 rounded-full bg-rose-500 relative z-10 shadow-[0_0_10px_rgba(244,63,94,1)]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                High-impact broken &amp; unclear promises
              </h2>
            </div>

            <div className="grid gap-4">
              {recentPromises.map((p) => (
                <Link
                  key={p.id}
                  href={`/promises/${p.id}`}
                  className="group block bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 hover:border-slate-600 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:bg-slate-800/60"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <p className="text-base md:text-lg font-medium text-slate-200 group-hover:text-white transition-colors leading-relaxed">
                      {p.promise_text}
                    </p>
                    <div className="shrink-0 mt-2 md:mt-0">
                      <StatusBadge status={p.status as PromiseStatus} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-4 text-sm font-medium">
                    <span className="capitalize px-3 py-1 rounded-lg bg-slate-950/50 border border-slate-800/50 text-slate-400 shadow-inner">{p.category}</span>
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(p.made_on).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/promises" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-all font-medium group shadow-lg">
                Explore all promises 
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-2">No promises tracked yet.</p>
            <Link href="/dashboard/promises" className="text-sm text-slate-400 hover:text-white">
              Add the first promise →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
