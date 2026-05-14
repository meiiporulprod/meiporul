import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

const STATUS_STYLES: Record<string, { label: string; cls: string; border: string }> = {
  pending:     { label: "Pending",     cls: "bg-orange-900/40 text-orange-300", border: "border-l-orange-500" },
  in_progress: { label: "In Progress", cls: "bg-blue-900/40 text-blue-300",    border: "border-l-blue-500" },
  fulfilled:   { label: "Fulfilled",   cls: "bg-green-900/40 text-green-300",  border: "border-l-green-500" },
  broken:      { label: "Broken",      cls: "bg-red-900/40 text-red-300",      border: "border-l-red-500" },
  unclear:     { label: "Unclear",     cls: "bg-slate-700 text-slate-300",     border: "border-l-slate-500" },
};

const FEASIBILITY_STYLES: Record<string, { label: string; cls: string }> = {
  fulfillable:   { label: "Fulfillable",          cls: "bg-green-900/30 text-green-400 border border-green-800" },
  partial:       { label: "Partially Fulfillable", cls: "bg-yellow-900/30 text-yellow-400 border border-yellow-800" },
  blocked:       { label: "Structurally Blocked",  cls: "bg-purple-900/30 text-purple-400 border border-purple-800" },
  unfulfillable: { label: "Not Fulfillable",       cls: "bg-red-900/20 text-red-400 border border-red-900" },
};

const IMPACT_COLORS: Record<string, string> = {
  high:   "text-orange-400",
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

  const [{ data: promise }, { data: related }] = await Promise.all([
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

  if (!promise) notFound();

  const status = STATUS_STYLES[promise.status] ?? STATUS_STYLES.unclear;
  const feasibility = promise.feasibility ? FEASIBILITY_STYLES[promise.feasibility] : null;

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <Link href="/promises" className="text-sm text-slate-500 hover:text-white mb-8 inline-flex items-center gap-1.5 transition-colors">
          ← All promises
        </Link>

        {/* Status + Feasibility badges */}
        <div className="flex flex-wrap gap-2 mb-5 mt-4">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${status.cls}`}>
            {status.label}
          </span>
          {feasibility && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${feasibility.cls}`}>
              {feasibility.label}
            </span>
          )}
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 capitalize ${IMPACT_COLORS[promise.impact_level]}`}>
            {promise.impact_level} impact
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 capitalize">
            {promise.category}
          </span>
        </div>

        {/* Promise text */}
        <h1 className="text-2xl font-bold leading-snug mb-2">{promise.promise_text}</h1>
        {promise.promise_tamil && (
          <p className="text-slate-400 leading-relaxed mb-6">{promise.promise_tamil}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 mb-8 border-b border-slate-800 pb-6">
          <span>By <span className="text-slate-300">{promise.made_by}</span></span>
          <span>
            Promised on{" "}
            <span className="text-slate-300">
              {new Date(promise.made_on).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </span>
          </span>
          {promise.source_url && (
            <a
              href={promise.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              {promise.source_name} →
            </a>
          )}
        </div>

        {/* Evidence block */}
        {promise.status_evidence ? (
          <div className={`border-l-4 ${status.border} bg-slate-900 rounded-r-xl p-5 mb-6`}>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">
              Current Reality
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{promise.status_evidence}</p>
            {promise.status_source_url && (
              <a
                href={promise.status_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
              >
                View evidence source →
              </a>
            )}
            {promise.status_updated_at && (
              <div className="mt-3 text-xs text-slate-600">
                Last updated:{" "}
                {new Date(promise.status_updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-slate-800 border-dashed rounded-xl p-5 mb-6 text-center">
            <p className="text-sm text-slate-500">No evidence documented yet. Status will be updated as information emerges.</p>
          </div>
        )}

        {/* Related articles */}
        {related && related.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Related Coverage
            </h2>
            <div className="space-y-3">
              {related.map((a) => (
                <a
                  key={a.id}
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
                >
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white leading-snug mb-1.5">
                    {a.title}
                  </p>
                  {a.summary && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{a.summary}</p>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-slate-600">
                    <span>{a.source_name}</span>
                    {a.published_at && (
                      <span>
                        {new Date(a.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
          <Link href="/promises" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to all promises
          </Link>
          <Link href="/fact-checks" className="text-sm text-slate-400 hover:text-white transition-colors">
            See fact-checks →
          </Link>
        </div>
      </main>
    </>
  );
}
