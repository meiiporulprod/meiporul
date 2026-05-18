import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function DraftsPage() {
  const supabase = await createClient();
  let { data: drafts } = await supabase
    .from("content_drafts")
    .select("id, content_type, content_english, content_tamil, hashtags, status, theme, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const statusColor: Record<string, string> = {
    draft:     "bg-slate-700 text-slate-300",
    approved:  "bg-green-900 text-green-300",
    rejected:  "bg-red-900 text-red-300",
    scheduled: "bg-blue-900 text-blue-300",
    published: "bg-purple-900 text-purple-300",
  };

  return (
    <div>
      <h1 className="font-['Bebas_Neue'] text-4xl md:text-5xl tracking-wider mb-2 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">CONTENT DRAFTS</h1>
      <p className="text-slate-400 text-base mb-8 font-light">AI-generated social content awaiting review.</p>

      <div className="space-y-4">
        {(drafts ?? []).map((d) => (
          <div key={d.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600/80 rounded-xl p-5 hover:bg-slate-800/40 hover:-translate-y-0.5 transition-all shadow-md group">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex gap-3 text-xs">
                <span className={`px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider border ${statusColor[d.status] ?? "bg-slate-800/40 text-slate-400 border-slate-700/50 shadow-[0_0_10px_rgba(148,163,184,0.1)]"}`}>
                  {d.status}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 capitalize bg-slate-950/50 border border-slate-800 px-2.5 py-1 rounded-md shadow-inner">
                  {d.content_type.replace("_", " ")}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {new Date(d.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </span>
            </div>
            
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-4 mb-3 shadow-inner">
              <p className="text-sm md:text-base leading-relaxed text-slate-200">{d.content_english}</p>
            </div>
            
            {d.content_tamil && (
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-4 mb-3 shadow-inner">
                <p className="text-sm md:text-base text-slate-300 leading-relaxed font-serif">{d.content_tamil}</p>
              </div>
            )}
            
            {d.hashtags && d.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/50">
                {d.hashtags.map((h: string) => (
                  <span key={h} className="text-xs font-medium text-blue-400/90 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/30 hover:bg-blue-900/40 hover:text-blue-300 transition-colors cursor-pointer">
                    #{h}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {(drafts ?? []).length === 0 && (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <p className="text-slate-400 font-medium">No drafts yet. Run the AI pipeline first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
