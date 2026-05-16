import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Link from "next/link";
import { notFound } from "next/navigation";
import BoothsClient from "./BoothsClient";

export const revalidate = 0;

export type BoothCandidate = { name: string; party: string; votes: number };
export type Booth = {
  booth_number: number;
  booth_name: string;
  candidates: BoothCandidate[];
  winner: BoothCandidate;
  runner: BoothCandidate | null;
  total_votes: number;
  margin: number;
};

export default async function BoothsPage({
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
    .select("id, number, name, name_tamil, district")
    .eq("number", num)
    .single();

  if (!constituency) notFound();

  // Fetch all booths with nested results for this constituency
  const { data: rawBooths } = await supabase
    .from("election_booths")
    .select("booth_number, booth_name, election_booth_results(candidate_name, party, votes)")
    .eq("constituency_id", constituency.id)
    .eq("election_year", 2026)
    .order("booth_number");

  const booths: Booth[] = (rawBooths ?? []).map((b) => {
    const candidates: BoothCandidate[] = ((b.election_booth_results as any[]) ?? [])
      .map((r) => ({ name: r.candidate_name, party: r.party, votes: r.votes }))
      .sort((a, z) => z.votes - a.votes);

    const total  = candidates.reduce((s, c) => s + c.votes, 0);
    const winner = candidates[0] ?? { name: "—", party: "—", votes: 0 };
    const runner = candidates[1] ?? null;

    return {
      booth_number: b.booth_number,
      booth_name:   b.booth_name ?? "",
      candidates,
      winner,
      runner,
      total_votes:  total,
      margin:       runner ? winner.votes - runner.votes : winner.votes,
    };
  });

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/elections" className="hover:text-white transition-colors">Elections</Link>
          <span>/</span>
          <Link href={`/elections/${num}`} className="hover:text-white transition-colors">
            {constituency.name}
          </Link>
          <span>/</span>
          <span className="text-slate-300">Booth Data</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{constituency.name}</h1>
          {constituency.name_tamil && (
            <p className="text-slate-400 text-sm">{constituency.name_tamil}</p>
          )}
          <p className="text-slate-500 text-sm mt-1">{constituency.district} District · AC #{String(num).padStart(3, "0")}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
          <Link
            href={`/elections/${num}`}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
          >
            Results
          </Link>
          <span className="px-3 py-1.5 text-sm font-medium text-white border-b-2 border-white -mb-px">
            Booth Data
          </span>
        </div>

        {booths.length > 0 ? (
          <BoothsClient booths={booths} />
        ) : (
          <div className="text-center py-24 text-slate-500">
            <p className="text-lg mb-2">No booth data yet.</p>
            <p className="text-sm">
              Run{" "}
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                python crawler/scrape_booths.py
              </code>{" "}
              to import Form 20 booth data.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
