import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

export default async function ArticlesPage() {
  const supabase = await createClient();
  let { data: articles } = await supabase
    .from("news_articles")
    .select("id, title, source_name, is_relevant, relevance_score, tags, status, published_at, source_url, crawled_at")
    .order("crawled_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="font-['Bebas_Neue'] text-4xl md:text-5xl tracking-wider mb-2 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">ARTICLES</h1>
      <p className="text-slate-400 text-base mb-8 font-light">All crawled articles from news sources awaiting review.</p>

      <div className="space-y-3">
        {(articles ?? []).map((a) => (
          <div key={a.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600/80 rounded-xl p-5 hover:bg-slate-800/40 hover:-translate-y-0.5 transition-all shadow-md group">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a href={a.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-base font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {a.title}
                </a>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    {a.source_name}
                  </span>
                  {a.published_at && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(a.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  )}
                  {a.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-1">
                      {a.tags?.map((t: string) => (
                        <span key={t} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md shadow-inner text-slate-400">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-1.5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                  a.status === "raw" ? "bg-slate-800/40 text-slate-400 border-slate-700/50 shadow-[0_0_10px_rgba(148,163,184,0.1)]" :
                  a.status === "reviewed" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]" :
                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                }`}>{a.status}</span>
                {a.is_relevant && (
                  <span className="text-xs font-medium text-emerald-400/80 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                    Relevant {a.relevance_score != null ? `(${(a.relevance_score * 100).toFixed(0)}%)` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {(articles ?? []).length === 0 && (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <p className="text-slate-400 font-medium">No articles yet. Run the crawler first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
