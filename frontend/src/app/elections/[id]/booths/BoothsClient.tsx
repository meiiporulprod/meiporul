"use client";

import { useState, useMemo } from "react";
import type { Booth, BoothCandidate } from "./page";

const PARTY_MAP: { match: string[]; color: string }[] = [
  { match: ["TVK"],    color: "#E8411B" },
  { match: ["AIADMK"], color: "#006400" },
  { match: ["DMK"],    color: "#E80000" },
  { match: ["BJP"],    color: "#FF9933" },
  { match: ["INC"],    color: "#19AAED" },
  { match: ["CPI(M)"], color: "#CC0000" },
  { match: ["CPI"],    color: "#CC2200" },
  { match: ["VCK"],    color: "#0000CD" },
  { match: ["DMDK"],   color: "#8B0000" },
  { match: ["PMK"],    color: "#FF6600" },
  { match: ["NTK"],    color: "#FF4500" },
  { match: ["MDMK"],   color: "#800080" },
  { match: ["IUML"],   color: "#009900" },
  { match: ["AMMK"],   color: "#9B1B30" },
];

const KEY_PARTIES = ["TVK", "DMK", "AIADMK", "NTK"];

function partyColor(party: string): string {
  const u = party.toUpperCase();
  for (const p of PARTY_MAP) {
    if (p.match.some((m) => u.includes(m))) return p.color;
  }
  return "#6B7280";
}

function getPartyVotes(booth: Booth, party: string): number {
  return booth.candidates
    .filter((c) => c.party.toUpperCase() === party.toUpperCase())
    .reduce((s, c) => s + c.votes, 0);
}

type SortKey = "booth" | "margin_desc" | "margin_asc" | "winner_pct";

export default function BoothsClient({ booths }: { booths: Booth[] }) {
  const [search,     setSearch]     = useState("");
  const [partyFilter, setPartyFilter] = useState("all");
  const [sort,       setSort]       = useState<SortKey>("booth");
  const [selected,   setSelected]   = useState<Booth | null>(null);

  // Derive which parties actually appear as winners (for filter chips)
  const winnerParties = useMemo(() => {
    const set = new Set(booths.map((b) => b.winner.party));
    return Array.from(set).sort();
  }, [booths]);

  // Summary stats
  const partySeatCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of booths) {
      const p = b.winner.party;
      map[p] = (map[p] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, z) => z[1] - a[1]);
  }, [booths]);

  const filtered = useMemo(() => {
    let list = booths;

    if (partyFilter !== "all") {
      list = list.filter((b) => b.winner.party === partyFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          String(b.booth_number).includes(q) ||
          b.booth_name.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, z) => {
      if (sort === "booth")        return a.booth_number - z.booth_number;
      if (sort === "margin_desc")  return z.margin - a.margin;
      if (sort === "margin_asc")   return a.margin - z.margin;
      if (sort === "winner_pct")   return (z.winner.votes / z.total_votes) - (a.winner.votes / a.total_votes);
      return 0;
    });

    return list;
  }, [booths, partyFilter, search, sort]);

  return (
    <div>
      {/* Party tally */}
      <div className="flex flex-wrap gap-2 mb-6">
        {partySeatCount.map(([party, count]) => {
          const color = partyColor(party);
          return (
            <button
              key={party}
              onClick={() => setPartyFilter(partyFilter === party ? "all" : party)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
              style={{
                background:   partyFilter === party ? `${color}20` : "rgb(15 23 42)",
                borderColor:  partyFilter === party ? `${color}60` : "rgb(30 41 59)",
              }}
            >
              <span className="text-lg font-bold" style={{ color }}>{count}</span>
              <span className="text-xs text-slate-300 font-medium">{party}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search booth # or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="booth">Sort: Booth #</option>
          <option value="margin_desc">Sort: Margin ↓</option>
          <option value="margin_asc">Sort: Margin ↑</option>
          <option value="winner_pct">Sort: Win %</option>
        </select>
        {(partyFilter !== "all" || search) && (
          <button
            onClick={() => { setPartyFilter("all"); setSearch(""); }}
            className="px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600 mb-4">{filtered.length} of {booths.length} booths</p>

      {/* Booth grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((booth) => {
          const color    = partyColor(booth.winner.party);
          const winnerPct = booth.total_votes > 0
            ? Math.round((booth.winner.votes / booth.total_votes) * 100)
            : 0;

          return (
            <button
              key={booth.booth_number}
              onClick={() => setSelected(booth)}
              className="text-left bg-slate-900 border rounded-xl overflow-hidden hover:border-slate-500 transition-colors group"
              style={{ borderColor: `${color}30` }}
            >
              <div className="h-1" style={{ background: color }} />
              <div className="p-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-slate-500">Booth {booth.booth_number}</div>
                    {booth.booth_name && (
                      <div className="text-xs text-slate-300 truncate mt-0.5 leading-tight">
                        {booth.booth_name}
                      </div>
                    )}
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${color}20`, color }}
                  >
                    {booth.winner.party}
                  </span>
                </div>

                {/* Winner name */}
                <div className="text-xs text-slate-400 truncate mb-2.5">
                  {booth.winner.name}
                </div>

                {/* Key party bars */}
                <div className="space-y-1.5">
                  {KEY_PARTIES.map((party) => {
                    const v    = getPartyVotes(booth, party);
                    if (v === 0) return null;
                    const pct  = booth.total_votes > 0 ? Math.round((v / booth.total_votes) * 100) : 0;
                    const c    = partyColor(party);
                    return (
                      <div key={party}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span style={{ color: c }}>{party}</span>
                          <span className="text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: c }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Margin */}
                <div className="mt-2.5 text-xs text-slate-600 flex justify-between">
                  <span>Margin: <span className="text-slate-400">{booth.margin.toLocaleString("en-IN")}</span></span>
                  <span>{winnerPct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-20 text-slate-600">No booths match your filters.</p>
      )}

      {/* Detail modal */}
      {selected && (
        <BoothModal booth={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function BoothModal({ booth, onClose }: { booth: Booth; onClose: () => void }) {
  const winnerColor = partyColor(booth.winner.party);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className="h-1.5" style={{ background: winnerColor }} />

        <div className="p-5">
          {/* Title */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-mono text-slate-500 mb-0.5">
                Booth {booth.booth_number}
              </div>
              {booth.booth_name && (
                <h2 className="text-base font-semibold text-slate-100">{booth.booth_name}</h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white text-xl leading-none ml-4"
            >
              ×
            </button>
          </div>

          {/* Winner banner */}
          <div
            className="rounded-xl p-3 mb-4 border"
            style={{ background: `${winnerColor}12`, borderColor: `${winnerColor}35` }}
          >
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: winnerColor }}>
              Winner
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{booth.winner.name}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: winnerColor }}>
                  {booth.winner.party}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {booth.winner.votes.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-slate-400">
                  {booth.total_votes > 0
                    ? Math.round((booth.winner.votes / booth.total_votes) * 100)
                    : 0}% of votes
                </div>
              </div>
            </div>
            {booth.runner && (
              <div
                className="mt-2 pt-2 border-t text-xs text-slate-400"
                style={{ borderColor: `${winnerColor}25` }}
              >
                Won by <span className="text-white font-medium">{booth.margin.toLocaleString("en-IN")}</span> votes
                over {booth.runner.name} ({booth.runner.party})
              </div>
            )}
          </div>

          {/* All candidates */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            All Candidates · {booth.total_votes.toLocaleString("en-IN")} votes
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {booth.candidates.map((c, i) => {
              const color  = partyColor(c.party);
              const pct    = booth.total_votes > 0
                ? Math.round((c.votes / booth.total_votes) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-slate-600 shrink-0">#{i + 1}</span>
                      <span className="text-xs text-slate-300 truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: `${color}18`, color }}
                      >
                        {c.party}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 w-12 text-right">
                        {c.votes.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
