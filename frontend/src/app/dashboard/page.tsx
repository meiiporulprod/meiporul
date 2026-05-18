import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: dbRawArticles },
    { count: dbPendingDrafts },
    { data: dbSummary },
  ] = await Promise.all([
    supabase.from("news_articles").select("*", { count: "exact", head: true }).eq("status", "raw"),
    supabase.from("content_drafts").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("promise_summary").select("*"),
  ]);

  const rawArticles = dbRawArticles ?? 0;
  const pendingDrafts = dbPendingDrafts ?? 0;
  const summary = dbSummary ?? [];

  const total = (summary ?? []).reduce((a: number, r: { total: number }) => a + r.total, 0);

  const stats = [
    { label: "Raw articles to review", value: rawArticles ?? 0, href: "/dashboard/articles", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "Drafts awaiting approval", value: pendingDrafts ?? 0, href: "/dashboard/drafts", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Total promises tracked", value: total, href: "/dashboard/promises", color: "text-white", bg: "bg-slate-800/40", border: "border-slate-700" },
  ];

  return (
    <div>
      <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wide text-slate-100 mb-8 drop-shadow-sm">OVERVIEW</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {stats.map(({ label, value, color, bg, border, href }) => (
          <Link key={label} href={href} className={`block bg-slate-900/40 backdrop-blur-md border ${border} rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-slate-800/50 group`}>
            <div className={`text-5xl font-black mb-2 ${color} group-hover:scale-105 transform origin-left transition-transform`}>{value}</div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800/60 pb-4">
          <div className="w-1.5 h-4 bg-red-500 rounded-full" />
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Promise Breakdown</h2>
        </div>
        
        <div className="space-y-4">
          {(summary ?? []).map((r: { status: string; total: number; high_impact: number }) => (
            <div key={r.status} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-200">{r.status.replace("_", " ")}</span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-300 font-bold">{r.total}</span> Total
                </span>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                  <span className="font-bold">{r.high_impact}</span> High Impact
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
