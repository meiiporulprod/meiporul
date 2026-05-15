import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";

export const revalidate = 3600;

// Maps full names and abbreviations → canonical abbreviation + color
const PARTY_MAP: { match: string[]; abbr: string; color: string }[] = [
  { match: ["TVK", "TAMILAGA VETTRI", "VETTRI KAZHAGAM"],   abbr: "TVK",    color: "#E8411B" },
  { match: ["DMK", "DRAVIDA MUNNETRA"],                      abbr: "DMK",    color: "#E80000" },
  { match: ["AIADMK", "ANNA DRAVIDA"],                       abbr: "AIADMK", color: "#006400" },
  { match: ["BJP", "BHARATIYA JANATA"],                      abbr: "BJP",    color: "#FF9933" },
  { match: ["INC", "INDIAN NATIONAL CONGRESS", "CONGRESS"],  abbr: "INC",    color: "#19AAED" },
  { match: ["CPI(M)", "COMMUNIST PARTY.*MARXIST"],           abbr: "CPI(M)", color: "#CC0000" },
  { match: ["CPI", "COMMUNIST PARTY"],                       abbr: "CPI",    color: "#CC2200" },
  { match: ["VCK", "VIDUTHALAI CHIRUTHAIGAL"],               abbr: "VCK",    color: "#0000CD" },
  { match: ["DMDK", "DESIYA MURPOKKU"],                      abbr: "DMDK",   color: "#8B0000" },
  { match: ["PMK", "PATTALI MAKKAL"],                        abbr: "PMK",    color: "#FF6600" },
  { match: ["NTK", "NAM TAMILAR"],                           abbr: "NTK",    color: "#FF4500" },
  { match: ["MDMK", "MARUMALARCHI"],                         abbr: "MDMK",   color: "#800080" },
  { match: ["TVK"],                                          abbr: "TVK",    color: "#E8411B" },
];

function resolveParty(party: string): { abbr: string; color: string } {
  const u = party.toUpperCase();
  for (const p of PARTY_MAP) {
    if (p.match.some((m) => u.includes(m))) return { abbr: p.abbr, color: p.color };
  }
  return { abbr: party.length > 10 ? party.slice(0, 8) + "…" : party, color: "#6B7280" };
}

const RESERVATION_LABELS: Record<string, string> = { sc: "SC", st: "ST", general: "" };

function marginLabel(margin: number): { label: string; cls: string } {
  if (margin < 2000)  return { label: "Very close", cls: "text-red-400" };
  if (margin < 5000)  return { label: "Close",       cls: "text-orange-400" };
  if (margin < 15000) return { label: "Moderate",    cls: "text-yellow-400" };
  return               { label: "Safe",             cls: "text-green-400" };
}

export default async function ElectionsPage() {
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("constituency_summary")
    .select("*")
    .order("number");

  const hasResults = (results?.length ?? 0) > 0;

  // Party seat count — normalise to canonical abbreviation
  const seatCount: Record<string, { seats: number; color: string }> = {};
  for (const r of results ?? []) {
    if (!r.winner_party) continue;
    const { abbr, color } = resolveParty(r.winner_party);
    if (!seatCount[abbr]) seatCount[abbr] = { seats: 0, color };
    seatCount[abbr].seats++;
  }
  const topParties = Object.entries(seatCount)
    .sort((a, b) => b[1].seats - a[1].seats)
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
          <div className="flex flex-wrap gap-3 mb-8">
            {topParties.map(([abbr, { seats, color }]) => (
              <div
                key={abbr}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
              >
                <div className="text-2xl font-bold" style={{ color }}>{seats}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{abbr}</div>
                  <div className="text-xs text-slate-500">seats</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Constituency cards */}
        {hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(results ?? []).map((r) => {
              const { abbr, color } = r.winner_party
                ? resolveParty(r.winner_party)
                : { abbr: "—", color: "#374151" };
              const margin = marginLabel(r.margin ?? 0);
              const barPct = r.winner_votes && r.total_votes
                ? Math.round((r.winner_votes / r.total_votes) * 100)
                : 0;

              return (
                <Link
                  key={r.id}
                  href={`/elections/${r.number}`}
                  className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl overflow-hidden transition-colors group"
                >
                  {/* Colour bar */}
                  <div className="h-1" style={{ background: color }} />

                  <div className="p-4">
                    {/* AC number + name */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs text-slate-600 font-mono">
                            {String(r.number).padStart(3, "0")}
                          </span>
                          {r.reservation !== "general" && (
                            <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                              {RESERVATION_LABELS[r.reservation]}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-200 group-hover:text-white leading-tight">
                          {r.name}
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: `${color}22`, color }}
                      >
                        {abbr}
                      </span>
                    </div>

                    {r.winner_name ? (
                      <>
                        {/* Winner name */}
                        <div className="text-sm text-slate-300 truncate mb-2">
                          {r.winner_name}
                        </div>

                        {/* Vote bar */}
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, background: color }}
                          />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{r.winner_votes?.toLocaleString("en-IN")} votes</span>
                          <span className={margin.cls}>
                            ↑{r.margin?.toLocaleString("en-IN")} · {margin.label}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-600 italic">Results pending</div>
                    )}
                  </div>
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
