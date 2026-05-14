import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";

export const revalidate = 3600;

const PARTY_COLORS: Record<string, string> = {
  TVK:          "#E8411B",
  DMK:          "#E80000",
  AIADMK:       "#006400",
  BJP:          "#FF9933",
  INC:          "#19AAED",
  "CPI(M)":     "#CC0000",
  CPI:          "#CC2200",
  VCK:          "#0000CD",
  DMDK:         "#8B0000",
  PMK:          "#FF6600",
  IND:          "#6B7280",
};

const RESERVATION_LABELS: Record<string, string> = {
  sc: "SC",
  st: "ST",
  general: "",
};

function partyColor(party: string): string {
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.toUpperCase().includes(key)) return color;
  }
  return PARTY_COLORS.IND;
}

function marginLabel(margin: number): { label: string; cls: string } {
  if (margin < 2000)  return { label: "Very close",  cls: "text-red-400" };
  if (margin < 5000)  return { label: "Close",        cls: "text-orange-400" };
  if (margin < 15000) return { label: "Moderate",     cls: "text-yellow-400" };
  return               { label: "Safe",              cls: "text-green-400" };
}

export default async function ElectionsPage() {
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("constituency_summary")
    .select("*")
    .order("number");

  const total      = results?.length ?? 0;
  const hasResults = total > 0;

  // Party seat count
  const seatCount: Record<string, number> = {};
  for (const r of results ?? []) {
    if (r.winner_party) {
      seatCount[r.winner_party] = (seatCount[r.winner_party] ?? 0) + 1;
    }
  }
  const topParties = Object.entries(seatCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            Tamil Nadu Legislative Assembly
          </p>
          <h1 className="text-3xl font-bold mb-2">2026 Election Results</h1>
          <p className="text-slate-400 text-sm">
            All 234 constituencies · Official ECI data
          </p>
        </div>

        {/* Party tally */}
        {hasResults && topParties.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {topParties.map(([party, seats]) => (
              <div
                key={party}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center"
              >
                <div
                  className="text-2xl font-bold mb-0.5"
                  style={{ color: partyColor(party) }}
                >
                  {seats}
                </div>
                <div className="text-xs text-slate-400 truncate">{party}</div>
              </div>
            ))}
          </div>
        )}

        {/* Constituency list */}
        {hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(results ?? []).map((r) => {
              const color = r.winner_party ? partyColor(r.winner_party) : "#6B7280";
              const margin = marginLabel(r.margin ?? 0);
              return (
                <Link
                  key={r.id}
                  href={`/elections/${r.number}`}
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
                >
                  {/* Top bar */}
                  <div
                    className="h-0.5 rounded-full mb-3 -mt-1 -mx-1"
                    style={{ background: color }}
                  />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 font-mono mr-1">
                        {String(r.number).padStart(3, "0")}
                      </span>
                      <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                        {r.name}
                      </span>
                      {r.reservation !== "general" && (
                        <span className="ml-1.5 text-xs text-slate-500">
                          ({RESERVATION_LABELS[r.reservation]})
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: `${color}22`, color }}
                    >
                      {r.winner_party}
                    </span>
                  </div>

                  {r.winner_name ? (
                    <>
                      <div className="text-sm text-slate-300 truncate mb-1">
                        {r.winner_name}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{r.district}</span>
                        <span className={margin.cls}>
                          {r.margin?.toLocaleString("en-IN")} · {margin.label}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-600 italic">Results pending</div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 text-slate-500">
            <p className="text-lg mb-2">No election data yet.</p>
            <p className="text-sm">
              Run{" "}
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                python crawler/scrape_elections.py
              </code>{" "}
              to import results.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
