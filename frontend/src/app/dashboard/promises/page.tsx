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

  const { data: promises } = await supabase
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Promises</h1>
        <span className="text-sm text-slate-400">{(promises ?? []).length} total</span>
      </div>
      <p className="text-slate-400 text-sm mb-8">Click any promise to update its status and evidence.</p>

      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 capitalize">
              {cat}
            </h2>
            <div className="space-y-1.5">
              {(items ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/promises/${p.id}`}
                  className="flex items-start gap-4 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed text-slate-200 group-hover:text-white">
                      {p.promise_text}
                    </p>
                    <div className="mt-1.5 flex gap-3 text-xs text-slate-500">
                      <span>{p.made_by}</span>
                      {p.status_updated_at && (
                        <span>
                          Updated {new Date(p.status_updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[p.status] ?? STATUS_COLORS.unclear}`}>
                      {p.status.replace("_", " ")}
                    </span>
                    {p.feasibility && FEASIBILITY_STYLES[p.feasibility] && (
                      <span className={`text-xs px-2.5 py-1 rounded-full ${FEASIBILITY_STYLES[p.feasibility].cls}`}>
                        {FEASIBILITY_STYLES[p.feasibility].label}
                      </span>
                    )}
                    {p.impact_level === "high" && (
                      <span className="text-xs text-orange-400">High impact</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {(promises ?? []).length === 0 && (
          <p className="text-center py-20 text-slate-500">No promises yet.</p>
        )}
      </div>
    </div>
  );
}
