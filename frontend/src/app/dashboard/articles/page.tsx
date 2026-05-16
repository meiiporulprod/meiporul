import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
// force rebuild

export const revalidate = 0;

export default async function ArticlesPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, title, source_name, is_relevant, relevance_score, tags, status, published_at, source_url, crawled_at")
    .order("crawled_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Articles</h1>
      <p className="text-slate-400 text-sm mb-8">All crawled articles from news sources.</p>

      <div className="space-y-2">
        {(articles ?? []).map((a) => (
          <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <a href={a.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-slate-300 transition-colors line-clamp-2">
                  {a.title}
                </a>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{a.source_name}</span>
                  {a.published_at && (
                    <span>{new Date(a.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                  )}
                  {a.tags?.map((t: string) => (
                    <span key={t} className="bg-slate-800 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === "raw" ? "bg-slate-700 text-slate-300" :
                  a.status === "reviewed" ? "bg-blue-900 text-blue-300" :
                  "bg-green-900 text-green-300"
                }`}>{a.status}</span>
                {a.is_relevant && (
                  <span className="text-xs text-green-400">
                    Relevant {a.relevance_score != null ? `(${(a.relevance_score * 100).toFixed(0)}%)` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {(articles ?? []).length === 0 && (
          <p className="text-center py-20 text-slate-500">No articles yet. Run the crawler first.</p>
        )}
      </div>
    </div>
  );
}
