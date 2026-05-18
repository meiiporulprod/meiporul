import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

function getStatusStyle(status: string) {
  switch (status) {
    case 'pending':     return { label: 'Pending',     color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', gradient: 'from-amber-500/20 to-transparent', dot: 'bg-amber-400' }
    case 'in_progress': return { label: 'In Progress', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', gradient: 'from-blue-500/20 to-transparent', dot: 'bg-blue-400' }
    case 'fulfilled':   return { label: 'Fulfilled',   color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', gradient: 'from-emerald-500/20 to-transparent', dot: 'bg-emerald-400' }
    case 'broken':      return { label: 'Broken',      color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', gradient: 'from-rose-500/20 to-transparent', dot: 'bg-rose-400' }
    default:            return { label: 'Unclear',     color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', gradient: 'from-slate-500/20 to-transparent', dot: 'bg-slate-400' }
  }
}

const FEASIBILITY_STYLES: Record<string, { label: string; color: string }> = {
  fulfillable:   { label: "Fulfillable",          color: "text-emerald-400" },
  partial:       { label: "Partially Fulfillable", color: "text-amber-400" },
  blocked:       { label: "Structurally Blocked",  color: "text-purple-400" },
  unfulfillable: { label: "Not Fulfillable",       color: "text-rose-400" },
};

const IMPACT_COLORS: Record<string, string> = {
  high:   "text-rose-400",
  medium: "text-slate-300",
  low:    "text-slate-500",
};

export default async function PromiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: dbPromise }, { data: dbRelated }] = await Promise.all([
    supabase
      .from("promises")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("news_articles")
      .select("id, title, source_name, source_url, published_at, summary")
      .eq("is_relevant", true)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  const promise = dbPromise;
  const related = dbRelated ?? [];

  if (!promise) notFound();

  const status = getStatusStyle(promise.status);
  const feasibility = promise.feasibility ? FEASIBILITY_STYLES[promise.feasibility] : null;

  return (
    <div className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      {/* Back Link */}
      <Link href="/promises" className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest mb-8 md:mb-12 group">
        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
        Back to Tracker
      </Link>

      <article>
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-sm shadow-sm ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${status.dot}`} />
            {status.label}
          </span>
          
          {feasibility && (
            <span className={`inline-flex items-center text-[10px] font-bold tracking-widest uppercase ${feasibility.color}`}>
              {feasibility.label}
            </span>
          )}
          
          <span className={`inline-flex items-center text-[10px] font-bold tracking-widest uppercase ${IMPACT_COLORS[promise.impact_level]}`}>
            {promise.impact_level} Impact
          </span>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <span className="inline-flex items-center text-[10px] font-mono text-slate-500 tracking-widest uppercase">
            {promise.category}
          </span>
        </div>

        {/* Promise Title */}
        <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl md:text-6xl leading-[1.1] tracking-wide text-slate-100 mb-4 drop-shadow-sm">
          {promise.promise_text}
        </h1>
        
        {promise.promise_tamil && (
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-8 font-light max-w-3xl">
            {promise.promise_tamil}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-mono text-slate-500 mb-12 py-5 border-y border-slate-800/60 bg-slate-900/20 backdrop-blur-sm rounded-2xl px-6">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest opacity-60">By</span>
            <span className="text-slate-300 font-semibold">{promise.made_by}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest opacity-60">Promised on</span>
            <span className="text-slate-300 font-semibold">
              {new Date(promise.made_on).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </span>
          </div>
          {promise.source_url && (
            <div className="flex items-center gap-2 ml-auto">
              <a
                href={promise.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-semibold group"
              >
                {promise.source_name}
                <span className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Evidence block */}
        {promise.status_evidence ? (
          <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-3xl p-6 md:p-8 mb-16">
            {/* Background Status Gradient */}
            <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${status.gradient} opacity-20 pointer-events-none`} />
            <div className={`absolute top-0 left-0 w-2 h-full ${status.dot}`} />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${status.color.split(' ')[0]}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="font-['Bebas_Neue'] text-2xl tracking-widest text-slate-200">
                  CURRENT REALITY
                </h2>
              </div>
              
              <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed md:text-lg mb-8">
                <p>{promise.status_evidence}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/60">
                {promise.status_updated_at && (
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Last Verified: <span className="text-slate-400">{new Date(promise.status_updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                  </div>
                )}
                
                {promise.status_source_url && (
                  <a
                    href={promise.status_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 transition-all uppercase shadow-lg group"
                  >
                    View Official Evidence
                    <span className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/20 backdrop-blur-md border border-slate-800/50 border-dashed rounded-3xl p-10 mb-16 text-center relative overflow-hidden">
            <svg className="w-10 h-10 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-400 text-sm">No evidence documented yet.<br/>Status will be updated as information emerges.</p>
          </div>
        )}

        {/* Related articles */}
        {related && related.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-['Bebas_Neue'] text-2xl tracking-widest text-slate-300 shrink-0">
                RELATED COVERAGE
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent" />
            </div>
            
            <div className="grid gap-4">
              {related.map((a) => (
                <a
                  key={a.id}
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 w-1 h-full bg-slate-700 group-hover:bg-red-500 transition-colors" />
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-200 group-hover:text-white leading-snug mb-2 transition-colors">
                        {a.title}
                      </h3>
                      {a.summary && (
                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
                          {a.summary}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0 mt-auto md:mt-0">
                      <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-400">{a.source_name}</span>
                      {a.published_at && (
                        <span>
                          {new Date(a.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="pt-8 border-t border-slate-800/60 flex justify-between items-center">
          <Link href="/promises" className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest group">
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            Back to All
          </Link>
          <Link href="/fact-checks" className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest group">
            Fact Checks
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
