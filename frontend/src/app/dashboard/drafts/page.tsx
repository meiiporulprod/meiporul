import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function DraftsPage() {
  const supabase = await createClient();
  const { data: drafts } = await supabase
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
      <h1 className="text-2xl font-bold mb-2">Content Drafts</h1>
      <p className="text-slate-400 text-sm mb-8">AI-generated social content awaiting review.</p>

      <div className="space-y-3">
        {(drafts ?? []).map((d) => (
          <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${statusColor[d.status] ?? "bg-slate-700 text-slate-300"}`}>
                  {d.status}
                </span>
                <span className="text-slate-500 capitalize">{d.content_type.replace("_", " ")}</span>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(d.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-2">{d.content_english}</p>
            {d.content_tamil && (
              <p className="text-sm text-slate-400 leading-relaxed mb-2">{d.content_tamil}</p>
            )}
            {d.hashtags && d.hashtags.length > 0 && (
              <p className="text-xs text-blue-400">{d.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
            )}
          </div>
        ))}
        {(drafts ?? []).length === 0 && (
          <p className="text-center py-20 text-slate-500">No drafts yet. Run the AI pipeline first.</p>
        )}
      </div>
    </div>
  );
}
