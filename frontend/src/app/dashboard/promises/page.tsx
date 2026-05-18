import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-orange-900/40 text-orange-300",
  in_progress: "bg-blue-900/40 text-blue-300",
  fulfilled:   "bg-green-900/40 text-green-300",
  broken:      "bg-red-900/40 text-red-300",
  unclear:     "bg-slate-700 text-slate-300",
};

const FEASIBILITY_STYLES: Record<string, { label: string; cls: string }> = {
  fulfillable:   { label: "Fulfillable",           cls: "bg-green-900/30 text-green-400" },
  partial:       { label: "Partially Fulfillable",  cls: "bg-yellow-900/30 text-yellow-400" },
  blocked:       { label: "Structurally Blocked",   cls: "bg-purple-900/30 text-purple-400" },
  unfulfillable: { label: "Not Fulfillable",        cls: "bg-red-900/20 text-red-400" },
};

export default async function DashboardPromisesPage() {
  const supabase = await createClient();

  let { data: promises } = await supabase
    .from("promises")
    .select("id, promise_text, category, status, impact_level, made_by, status_updated_at, feasibility")
    .order("category")
    .order("impact_level", { ascending: false });

  const grouped: Record<string, typeof promises> = {};
  for (const p of promises ?? []) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category]!.push(p);
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <h1 className="font-['Bebas_Neue'] text-4xl md:text-5xl tracking-wider bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">PROMISES</h1>
        <span className="text-sm font-medium text-slate-400 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">{(promises ?? []).length} total</span>
      </div>
      <p className="text-slate-400 text-base mb-10 font-light">Click any promise to update its status and evidence.</p>

      <div className="space-y-10">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest capitalize">
                {cat}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent" />
            </div>
            
            <div className="space-y-3">
              {(items ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/promises/${p.id}`}
                  className="flex flex-col md:flex-row md:items-start gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600/80 rounded-xl p-5 hover:bg-slate-800/40 hover:-translate-y-0.5 transition-all shadow-md group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium leading-relaxed text-slate-200 group-hover:text-white transition-colors">
                      {p.promise_text}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-800/80 px-2.5 py-1 rounded-md shadow-inner text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {p.made_by}
                      </span>
                      {p.status_updated_at && (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Updated {new Date(p.status_updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider border shadow-sm ${
                      p.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)]' :
                      p.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' :
                      p.status === 'fulfilled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
                      p.status === 'broken' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]' :
                      'bg-slate-800/40 text-slate-400 border-slate-700/50'
                    }`}>
                      {p.status.replace("_", " ")}
                    </span>
                    
                    <div className="flex gap-2">
                      {p.feasibility && FEASIBILITY_STYLES[p.feasibility] && (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border uppercase tracking-wider ${
                          p.feasibility === 'fulfillable' ? 'bg-emerald-950/30 text-emerald-400/90 border-emerald-900/30' :
                          p.feasibility === 'partial' ? 'bg-yellow-950/30 text-yellow-400/90 border-yellow-900/30' :
                          p.feasibility === 'blocked' ? 'bg-purple-950/30 text-purple-400/90 border-purple-900/30' :
                          'bg-red-950/30 text-red-400/90 border-red-900/30'
                        }`}>
                          {FEASIBILITY_STYLES[p.feasibility].label}
                        </span>
                      )}
                      
                      {p.impact_level === "high" && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-950/40 border border-orange-900/40 text-orange-400 uppercase tracking-wider flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          High
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {(promises ?? []).length === 0 && (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <p className="text-slate-400 font-medium">No promises yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
