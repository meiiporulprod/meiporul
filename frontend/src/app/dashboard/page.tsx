import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: rawArticles },
    { count: pendingDrafts },
    { data: summary },
  ] = await Promise.all([
    supabase.from("news_articles").select("*", { count: "exact", head: true }).eq("status", "raw"),
    supabase.from("content_drafts").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("promise_summary").select("*"),
  ]);

  const total = (summary ?? []).reduce((a: number, r: { total: number }) => a + r.total, 0);

  const stats = [
    { label: "Raw articles to review", value: rawArticles ?? 0, href: "/dashboard/articles", color: "text-yellow-400" },
    { label: "Drafts awaiting approval", value: pendingDrafts ?? 0, href: "/dashboard/drafts", color: "text-blue-400" },
    { label: "Total promises tracked", value: total, href: "/dashboard/promises", color: "text-white" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className={`text-4xl font-bold mb-1 ${color}`}>{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Promise breakdown</h2>
        <div className="space-y-2">
          {(summary ?? []).map((r: { status: string; total: number; high_impact: number }) => (
            <div key={r.status} className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-300">{r.status.replace("_", " ")}</span>
              <div className="flex gap-4 text-slate-400">
                <span>{r.total} total</span>
                <span className="text-orange-400">{r.high_impact} high impact</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
