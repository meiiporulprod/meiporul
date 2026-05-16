import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
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

  const { data: constituency } = await supabase
    .from("election_constituencies")
    .select("*")
    .eq("number", num)
    .single();

  if (!constituency) notFound();

  const { data: candidates } = await supabase
    .from("election_results")
    .select("*")
    .eq("constituency_id", constituency.id)
    .eq("election_year", 2026)
    .order("rank");

  const myResults = candidates ?? [];

  const winner    = myResults[0];
  const runnerUp  = myResults[1];
  const margin    = winner && runnerUp ? winner.total_votes - runnerUp.total_votes : null;
  const totalVotes = myResults.reduce((s, c) => s + c.total_votes, 0);
  const winnerColor = winner ? partyColor(winner.party) : "#6B7280";

  const prevNum = num > 1 ? num - 1 : null;
  const nextNum = num < 234 ? num + 1 : null;

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Back + nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/elections" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← All constituencies
          </Link>
          <div className="flex gap-3 text-sm text-slate-500">
            {prevNum && (
              <Link href={`/elections/${prevNum}`} className="hover:text-white transition-colors">
                ← {prevNum}
              </Link>
            )}
            {nextNum && (
              <Link href={`/elections/${nextNum}`} className="hover:text-white transition-colors">
                {nextNum} →
              </Link>
            )}
          </div>
        </div>

        {/* Constituency header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-mono text-slate-500">
              #{String(num).padStart(3, "0")}
            </span>
            {constituency.reservation !== "general" && (
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                {constituency.reservation}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-1">{constituency.name}</h1>
          {constituency.name_tamil && (
            <p className="text-slate-400">{constituency.name_tamil}</p>
          )}
          <p className="text-sm text-slate-500 mt-1">{constituency.district} District</p>
        </div>

        {/* Winner card */}
        {winner && (
          <div
            className="rounded-xl p-5 mb-6 border"
            style={{
              background: `${winnerColor}10`,
              borderColor: `${winnerColor}40`,
            }}
          >
            <div className="text-xs uppercase tracking-widest mb-2"
                 style={{ color: winnerColor }}>
              Winner
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-white mb-0.5">
                  {winner.candidate_name}
                </div>
                <div className="text-sm font-semibold" style={{ color: winnerColor }}>
                  {winner.party}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-white">
                  {winner.total_votes.toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-slate-400">
                  {winner.vote_share}% of votes
                </div>
              </div>
            </div>
            {margin !== null && runnerUp && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm"
                   style={{ borderColor: `${winnerColor}30` }}>
                <span className="text-slate-400">
                  Won by <span className="text-white font-semibold">
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
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              All Candidates · {totalVotes.toLocaleString("en-IN")} total votes
            </h2>
            <div className="space-y-2">
              {myResults.map((c) => {
                const color  = partyColor(c.party);
                const barPct = totalVotes > 0
                  ? Math.round((c.total_votes / totalVotes) * 100)
                  : 0;
                return (
                  <div
                    key={c.id}
                    className={`bg-slate-900 border rounded-lg p-4 ${
                      c.is_winner ? "border-slate-600" : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-slate-600 shrink-0">
                          #{c.rank}
                        </span>
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {c.candidate_name}
                        </span>
                        {c.is_winner && (
                          <span className="text-xs shrink-0" style={{ color }}>✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ background: `${color}18`, color }}
                        >
                          {c.party}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">
                          {c.total_votes.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    {/* Vote bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barPct}%`, background: color }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">
                        {c.vote_share}%
                      </span>
                    </div>
                    {(c.evm_votes > 0 || c.postal_votes > 0) && (
                      <div className="mt-1 text-xs text-slate-600">
                        EVM: {c.evm_votes.toLocaleString("en-IN")} ·
                        Postal: {c.postal_votes.toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <p>No candidate data for this constituency yet.</p>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between">
          <Link href="/elections" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← All constituencies
          </Link>
          {nextNum && (
            <Link href={`/elections/${nextNum}`} className="text-sm text-slate-400 hover:text-white transition-colors">
              Next constituency →
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
