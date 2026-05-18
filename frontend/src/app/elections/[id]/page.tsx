import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

const PARTY_MAP: { match: string[]; color: string }[] = [
  { match: ["TVK", "TAMILAGA VETTRI", "TAMILAGA KAZHAGAM", "VETTRI KAZHAGAM"], color: "#E8411B" },
  { match: ["AIADMK", "ANNA DRAVIDA", "MUNNETRA ANNA"],      color: "#006400" },
  { match: ["DMK", "DRAVIDA MUNNETRA"],                      color: "#E80000" },
  { match: ["BJP", "BHARATIYA JANATA"],                      color: "#FF9933" },
  { match: ["INC", "INDIAN NATIONAL CONGRESS", "CONGRESS"],  color: "#19AAED" },
  { match: ["CPI(M)", "MARXIST"],                            color: "#CC0000" },
  { match: ["CPI", "COMMUNIST PARTY OF INDIA"],              color: "#CC2200" },
  { match: ["VCK", "VIDUTHALAI CHIRUTHAIGAL"],               color: "#0000CD" },
  { match: ["DMDK", "DESIYA MURPOKKU"],                      color: "#8B0000" },
  { match: ["PMK", "PATTALI MAKKAL"],                        color: "#FF6600" },
  { match: ["NTK", "NAM TAMILAR"],                           color: "#FF4500" },
  { match: ["MDMK", "MARUMALARCHI"],                         color: "#800080" },
  { match: ["IUML", "INDIAN UNION MUSLIM"],                  color: "#009900" },
  { match: ["AMMK", "AMMA MAKKAL"],                          color: "#9B1B30" },
];

function partyColor(party: string): string {
  const u = party.toUpperCase();
  for (const p of PARTY_MAP) {
    if (p.match.some((m) => u.includes(m))) return p.color;
  }
  return "#6B7280";
}

export default async function ConstituencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const num = parseInt(id);
  if (isNaN(num)) notFound();

  const supabase = await createClient();

  const { data: constituencyResult } = await supabase
    .from("election_constituencies")
    .select("*")
    .eq("number", num)
    .single();

  const { data: candidates } = await supabase
    .from("election_results")
    .select("*")
    .eq("constituency_id", constituencyResult?.id)
    .eq("election_year", 2026)
    .order("rank");

  let constituency = constituencyResult;
  let myResults = candidates ?? [];
  if (!constituency) notFound();


  const winner    = myResults[0];
  const runnerUp  = myResults[1];
  const margin    = winner && runnerUp ? winner.total_votes - runnerUp.total_votes : null;
  const totalVotes = myResults.reduce((s, c) => s + c.total_votes, 0);
  const winnerColor = winner ? partyColor(winner.party) : "#6B7280";

  const prevNum = num > 1 ? num - 1 : null;
  const nextNum = num < 234 ? num + 1 : null;

  return (
    <>
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <main className="max-w-3xl mx-auto px-4 py-12 relative">

        {/* Back + nav */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/elections" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            All constituencies
          </Link>
          <div className="flex gap-4 text-sm font-medium text-slate-500">
            {prevNum && (
              <Link href={`/elections/${prevNum}`} className="flex items-center gap-1 hover:text-white transition-colors group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {String(prevNum).padStart(3, "0")}
              </Link>
            )}
            {nextNum && (
              <Link href={`/elections/${nextNum}`} className="flex items-center gap-1 hover:text-white transition-colors group">
                {String(nextNum).padStart(3, "0")}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
          <span className="px-3 py-1.5 text-sm font-medium text-white border-b-2 border-white -mb-px">
            Results
          </span>
          <Link
            href={`/elections/${num}/booths`}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
          >
            Booth Data
          </Link>
        </div>

        {/* Constituency header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
              #{String(num).padStart(3, "0")}
            </span>
            {constituency.reservation !== "general" && (
              <span className="text-xs font-semibold tracking-wider bg-indigo-900/30 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md uppercase">
                {constituency.reservation}
              </span>
            )}
          </div>
          <h1 className="font-['Bebas_Neue'] text-5xl md:text-7xl tracking-wider mb-1 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-lg">
            {constituency.name}
          </h1>
          {constituency.name_tamil && (
            <p className="text-slate-400 text-lg md:text-xl font-light mb-2">{constituency.name_tamil}</p>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mt-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {constituency.district} District
          </div>
        </div>

        {/* Winner card */}
        {winner && (
          <div
            className="rounded-2xl p-6 md:p-8 mb-10 border shadow-2xl relative overflow-hidden group"
            style={{
              background: `${winnerColor}15`,
              borderColor: `${winnerColor}30`,
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${winnerColor}, transparent 70%)` }} />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <span className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: winnerColor, boxShadow: `0 0 10px ${winnerColor}` }} />
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: winnerColor }}>
                Winner
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow-sm">
                  {winner.candidate_name}
                </div>
                <div className="text-lg md:text-xl font-semibold opacity-90 drop-shadow-sm" style={{ color: winnerColor }}>
                  {winner.party}
                </div>
              </div>
              <div className="text-left md:text-right shrink-0">
                <div className="text-4xl md:text-5xl font-['Bebas_Neue'] tracking-wide text-white drop-shadow-md">
                  {winner.total_votes.toLocaleString("en-IN")}
                </div>
                <div className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  {winner.vote_share}% of votes
                </div>
              </div>
            </div>
            {margin !== null && runnerUp && (
              <div className="mt-6 pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between text-sm md:text-base relative z-10"
                   style={{ borderColor: `${winnerColor}20` }}>
                <span className="text-slate-300">
                  Won by <span className="text-white font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${winnerColor}20` }}>
                    {margin.toLocaleString("en-IN")}
                  </span> votes over {runnerUp.candidate_name} ({runnerUp.party})
                </span>
              </div>
            )}
          </div>
        )}

        {/* All candidates */}
        {myResults.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                All Candidates
              </h2>
              <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
                {totalVotes.toLocaleString("en-IN")} total votes
              </div>
            </div>
            
            <div className="space-y-3">
              {myResults.map((c) => {
                const color  = partyColor(c.party);
                const barPct = totalVotes > 0
                  ? Math.round((c.total_votes / totalVotes) * 100)
                  : 0;
                return (
                  <div
                    key={c.id}
                    className={`bg-slate-900/40 backdrop-blur-md border rounded-xl p-4 md:p-5 transition-all duration-300 hover:bg-slate-800/60 ${
                      c.is_winner ? "border-slate-600/60 shadow-lg" : "border-slate-800/80 hover:border-slate-700/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 shrink-0 shadow-inner">
                          {c.rank}
                        </span>
                        <span className="text-base md:text-lg font-medium text-slate-100 truncate">
                          {c.candidate_name}
                        </span>
                        {c.is_winner && (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-md tracking-wide"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                        >
                          {c.party}
                        </span>
                        <span className="text-base md:text-lg font-bold text-slate-200 font-mono">
                          {c.total_votes.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    {/* Vote bar */}
                    <div className="flex items-center gap-3 pl-11">
                      <div className="flex-1 h-2 bg-slate-950 border border-slate-800/50 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${barPct}%`, background: color, boxShadow: `0 0 10px ${color}80` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-400 w-10 text-right">
                        {c.vote_share}%
                      </span>
                    </div>
                    {(c.evm_votes > 0 || c.postal_votes > 0) && (
                      <div className="mt-3 pl-11 flex gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                          EVM: {c.evm_votes.toLocaleString("en-IN")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Postal: {c.postal_votes.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/20 backdrop-blur-sm border border-slate-800/50 rounded-2xl">
            <p className="text-slate-400 font-medium">No candidate data available for this constituency yet.</p>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex justify-between">
          <Link href="/elections" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            All constituencies
          </Link>
          {nextNum && (
            <Link href={`/elections/${nextNum}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group">
              Next constituency
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
