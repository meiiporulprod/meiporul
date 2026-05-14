import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import type { FactCheck } from "@/lib/types";

export const revalidate = 3600;

const VERDICT_STYLES: Record<string, { label: string; cls: string }> = {
  true:        { label: "True",        cls: "bg-green-900/40 text-green-300 border-green-800" },
  false:       { label: "False",       cls: "bg-red-900/40 text-red-300 border-red-800" },
  misleading:  { label: "Misleading",  cls: "bg-orange-900/40 text-orange-300 border-orange-800" },
  unverified:  { label: "Unverified",  cls: "bg-slate-700 text-slate-300 border-slate-600" },
  satire:      { label: "Satire",      cls: "bg-purple-900/40 text-purple-300 border-purple-800" },
};

export default async function FactChecksPage() {
  const supabase = await createClient();

  const { data: factChecks } = await supabase
    .from("fact_checks")
    .select("id, claim, claim_tamil, verdict, explanation, explanation_tamil, confidence, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const counts = (factChecks ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.verdict] = (acc[f.verdict] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Fact Checks</h1>
        <p className="text-slate-400 mb-8">
          Claims by Tamil Nadu politicians — verified against documented evidence.
        </p>

        {/* Summary bar */}
        {(factChecks ?? []).length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {Object.entries(VERDICT_STYLES).map(([verdict, { label, cls }]) =>
              counts[verdict] ? (
                <span key={verdict} className={`text-xs px-3 py-1.5 rounded-full border ${cls}`}>
                  {counts[verdict]} {label}
                </span>
              ) : null
            )}
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {(factChecks ?? []).map((f) => {
            const verdict = VERDICT_STYLES[f.verdict] ?? VERDICT_STYLES.unverified;
            return (
              <div
                key={f.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-relaxed text-white">{f.claim}</p>
                    {f.claim_tamil && (
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">{f.claim_tamil}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${verdict.cls}`}>
                    {verdict.label}
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{f.explanation}</p>
                {f.explanation_tamil && (
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.explanation_tamil}</p>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  {f.confidence && (
                    <span className="capitalize">Confidence: {f.confidence}</span>
                  )}
                  <span>
                    {new Date(f.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </div>
              </div>
            );
          })}

          {(factChecks ?? []).length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg mb-2">No fact-checks published yet.</p>
              <p className="text-sm">Check back soon — the pipeline is running.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
