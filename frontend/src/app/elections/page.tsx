import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0;

// Maps full names and abbreviations → canonical abbreviation + color.
const PARTY_MAP: { match: string[]; abbr: string; color: string }[] = [
  { match: ["TVK", "TAMILAGA VETTRI", "TAMILAGA KAZHAGAM", "VETTRI KAZHAGAM"], abbr: "TVK",    color: "#E8411B" },
  { match: ["AIADMK", "ANNA DRAVIDA", "MUNNETRA ANNA"],      abbr: "AIADMK", color: "#00b300" },
  { match: ["DMK", "DRAVIDA MUNNETRA"],                      abbr: "DMK",    color: "#E80000" },
  { match: ["BJP", "BHARATIYA JANATA"],                      abbr: "BJP",    color: "#FF9933" },
  { match: ["INC", "INDIAN NATIONAL CONGRESS", "CONGRESS"],  abbr: "INC",    color: "#19AAED" },
  { match: ["CPI(M)", "MARXIST"],                            abbr: "CPI(M)", color: "#CC0000" },
  { match: ["CPI", "COMMUNIST PARTY OF INDIA"],              abbr: "CPI",    color: "#CC2200" },
  { match: ["VCK", "VIDUTHALAI CHIRUTHAIGAL"],               abbr: "VCK",    color: "#4169E1" },
  { match: ["DMDK", "DESIYA MURPOKKU"],                      abbr: "DMDK",   color: "#CD5C5C" },
  { match: ["PMK", "PATTALI MAKKAL"],                        abbr: "PMK",    color: "#FF8C00" },
  { match: ["NTK", "NAM TAMILAR"],                           abbr: "NTK",    color: "#FF4500" },
  { match: ["MDMK", "MARUMALARCHI"],                         abbr: "MDMK",   color: "#BA55D3" },
  { match: ["IUML", "INDIAN UNION MUSLIM"],                  abbr: "IUML",   color: "#32CD32" },
  { match: ["AMMK", "AMMA MAKKAL"],                          abbr: "AMMK",   color: "#DC143C" },
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
  if (margin < 2000)  return { label: "Very close", cls: "text-rose-400" };
  if (margin < 5000)  return { label: "Close",       cls: "text-orange-400" };
  if (margin < 15000) return { label: "Moderate",    cls: "text-amber-400" };
  return               { label: "Safe",             cls: "text-emerald-400" };
}

export default async function ElectionsPage() {
  const supabase = await createClient();

  let { data: results } = await supabase
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
    .sort((a, b) => b[1].seats - a[1].seats);

  return (
    <div className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-red-900/10 blur-[130px] rounded-[100%] pointer-events-none -z-10" />

      {/* Header */}
      <header className="mb-12 text-center md:text-left">
        <p className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Tamil Nadu Legislative Assembly
        </p>
        <h1 className="font-['Bebas_Neue'] text-5xl sm:text-6xl md:text-7xl leading-[1.1] tracking-wide text-slate-100 mb-4 drop-shadow-sm">
          2026 ELECTION RESULTS
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed font-light max-w-2xl">
          Live tracking of all 234 constituencies using official ECI data.
        </p>
      </header>

      {/* Party tally */}
      {hasResults && topParties.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-12 relative z-10">
          <span className="text-xs font-mono text-slate-500 tracking-widest uppercase mr-2 w-full md:w-auto text-center md:text-left">
            Current Seat Tally:
          </span>
          {topParties.map(([abbr, { seats, color }]) => (
            <div
              key={abbr}
              className="flex items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 shadow-lg rounded-2xl px-5 py-3 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full opacity-80" style={{ background: color }} />
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ background: `linear-gradient(45deg, transparent, ${color})` }} />
              
              <div className="text-3xl font-black tracking-tighter" style={{ color, textShadow: `0 0 20px ${color}40` }}>
                {seats}
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-bold tracking-widest text-slate-200 uppercase">{abbr}</div>
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">seats</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constituency cards */}
      {hasResults ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
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
                className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:bg-slate-800/60 hover:border-slate-700 relative flex flex-col h-full"
              >
                {/* Glowing Top Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />

                <div className="p-5 flex flex-col h-full">
                  {/* AC number + name */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest px-2 py-0.5 rounded bg-slate-950 border border-slate-800/50">
                          AC-{String(r.number).padStart(3, "0")}
                        </span>
                        {r.reservation !== "general" && (
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            {RESERVATION_LABELS[r.reservation]}
                          </span>
                        )}
                      </div>
                      <div className="text-base font-bold text-slate-200 group-hover:text-white leading-snug transition-colors">
                        {r.name}
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-xs font-black tracking-widest px-2.5 py-1 rounded-lg border uppercase shadow-sm"
                      style={{ background: `${color}15`, color, borderColor: `${color}30` }}
                    >
                      {abbr}
                    </span>
                  </div>

                  {r.winner_name ? (
                    <div className="mt-auto">
                      {/* Winner name */}
                      <div className="text-sm font-medium text-slate-300 truncate mb-3">
                        {r.winner_name}
                      </div>

                      {/* Vote bar */}
                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mb-3 border border-slate-800/50 shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
                        />
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase">
                        <span className="text-slate-500">{r.winner_votes?.toLocaleString("en-IN")} votes</span>
                        <span className={`font-semibold ${margin.cls}`}>
                          ↑ {r.margin?.toLocaleString("en-IN")} <span className="opacity-60 hidden sm:inline">({margin.label})</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto pt-6 pb-2 text-center">
                      <span className="text-[10px] uppercase tracking-widest font-mono text-slate-600 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 border-dashed">
                        Counting in Progress
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-32 bg-slate-900/20 backdrop-blur-md border border-slate-800/50 border-dashed rounded-3xl relative z-10 max-w-2xl mx-auto">
          <svg className="w-12 h-12 mx-auto text-slate-600 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <p className="text-xl text-slate-300 font-semibold mb-2">Awaiting Election Data</p>
          <p className="text-sm text-slate-500">
            Run{" "}
            <code className="bg-slate-950 px-2 py-1 rounded text-red-400 font-mono border border-slate-800">
              python crawler/scrape_elections.py
            </code>{" "}
            to sync official ECI results.
          </p>
        </div>
      )}
    </div>
  );
}
