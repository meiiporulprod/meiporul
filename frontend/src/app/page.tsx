import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { PromiseStatus } from "@/lib/types";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: summary }, { data: recentPromises }] = await Promise.all([
    supabase.from("promise_summary").select("*"),
    supabase
      .from("promises")
      .select("id, promise_text, category, status, impact_level, made_on")
      .in("status", ["broken", "unclear"])
      .eq("impact_level", "high")
      .order("made_on", { ascending: false })
      .limit(5),
  ]);

  const counts = Object.fromEntries(
    (summary ?? []).map((r: { status: string; total: number }) => [r.status, r.total])
  );
  const total = Object.values(counts).reduce((a: number, b) => a + (b as number), 0);
  const fulfilled = counts["fulfilled"] ?? 0;
  const broken = counts["broken"] ?? 0;
  const pct = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Hold Tamil Nadu accountable.</h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Tracking every promise made by TVK, DMK, AIADMK and Tamil Nadu politicians — verified with evidence.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Total Promises", value: total, color: "text-white" },
            { label: "Fulfilled", value: fulfilled, color: "text-green-400" },
            { label: "Broken", value: broken, color: "text-red-400" },
            { label: "Kept Rate", value: `${pct}%`, color: pct >= 50 ? "text-green-400" : "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {recentPromises && recentPromises.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              High-impact broken &amp; unclear promises
            </h2>
            <div className="space-y-3">
              {recentPromises.map((p) => (
                <Link
                  key={p.id}
                  href={`/promises/${p.id}`}
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm leading-relaxed">{p.promise_text}</p>
                    <StatusBadge status={p.status as PromiseStatus} />
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-slate-500">
                    <span className="capitalize">{p.category}</span>
                    <span>{new Date(p.made_on).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/promises" className="inline-block mt-4 text-sm text-slate-400 hover:text-white transition-colors">
              View all promises →
            </Link>
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-2">No promises tracked yet.</p>
            <Link href="/dashboard/promises" className="text-sm text-slate-400 hover:text-white">
              Add the first promise →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
