'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Promise as PromiseRecord } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  women: 'Women & Family',
  youth: 'Youth & Employment',
  education: 'Education',
  health: 'Health & Social Welfare',
  governance: 'Governance & Accountability',
  economy: 'Agriculture & Economy',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  broken: 'Broken',
  unclear: 'Unclear',
}

const CATEGORY_ORDER = ['women', 'youth', 'education', 'health', 'governance', 'economy']

function getStatusGradient(status: string) {
  switch (status) {
    case 'pending':     return 'from-amber-400 to-amber-600'
    case 'in_progress': return 'from-blue-400 to-blue-600'
    case 'fulfilled':   return 'from-emerald-400 to-emerald-600'
    case 'broken':      return 'from-rose-400 to-rose-600'
    default:            return 'from-slate-400 to-slate-600'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':     return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'fulfilled':   return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'broken':      return 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    default:            return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

const FEASIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  fulfillable:   { label: "Fulfillable",           color: "text-emerald-400" },
  partial:       { label: "Partially Fulfillable",  color: "text-amber-400" },
  blocked:       { label: "Structurally Blocked",   color: "text-purple-400" },
  unfulfillable: { label: "Not Fulfillable",        color: "text-rose-400" },
}

export default function PromiseTracker({ promises }: { promises: PromiseRecord[] }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => ({
    total:      promises.length,
    pending:    promises.filter(p => p.status === 'pending').length,
    inProgress: promises.filter(p => p.status === 'in_progress').length,
    fulfilled:  promises.filter(p => p.status === 'fulfilled').length,
    broken:     promises.filter(p => p.status === 'broken').length,
  }), [promises])

  const pct = (n: number) => stats.total ? Math.round((n / stats.total) * 100) : 0
  const pctFulfilled  = pct(stats.fulfilled)
  const pctInProgress = pct(stats.inProgress)
  const pctBroken     = pct(stats.broken)
  const pctPending    = 100 - pctFulfilled - pctInProgress - pctBroken

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return promises.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (q) {
        return p.promise_text.toLowerCase().includes(q) ||
          (p.promise_tamil ?? '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [promises, statusFilter, search])

  const grouped = useMemo(() => {
    const map: Record<string, PromiseRecord[]> = {}
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = []
      map[p.category].push(p)
    }
    return map
  }, [filtered])

  const sortedCategories = CATEGORY_ORDER.filter(c => grouped[c])
    .concat(Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)))

  const brokenPromises = promises.filter(p => p.status === 'broken')

  const lastUpdated = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  return (
    <div className="relative min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-red-900/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      {/* HEADER */}
      <header className="mb-12 md:mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <Link href="/" className="inline-block text-xs font-mono text-red-500 tracking-[0.2em] uppercase hover:text-red-400 transition-colors">
              MEIPORUL · TRUTH REGISTER
            </Link>
            <h1 className="font-['Bebas_Neue'] text-5xl sm:text-7xl md:text-8xl leading-[0.9] tracking-wider bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent drop-shadow-sm">
              VIJAY / TVK<br />
              <span className="text-red-500 bg-none bg-clip-border text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">PROMISE</span> TRACKER
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl mt-4 leading-relaxed font-light">
              40-point manifesto, Tamil Nadu 2026. Every promise tracked against documented evidence. No spin — just the record.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/50 text-slate-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              LIVE TRACKING
            </div>
            <div className="text-xs font-mono text-slate-500">Last updated: {lastUpdated}</div>
          </div>
        </div>
      </header>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-16 relative z-10">
        {[
          { label: "Total Promises", value: stats.total, sub: "From 40-point manifesto", gradient: "from-slate-200 to-slate-500" },
          { label: "Pending", value: stats.pending, sub: "No action taken", gradient: "from-amber-300 to-amber-600" },
          { label: "In Progress", value: stats.inProgress, sub: "Partial action", gradient: "from-blue-300 to-blue-600" },
          { label: "Fulfilled", value: stats.fulfilled, sub: "Fully delivered", gradient: "from-emerald-300 to-emerald-600" },
          { label: "Broken", value: stats.broken, sub: "Contradicted by evidence", gradient: "from-rose-300 to-rose-600" },
        ].map(({ label, value, sub, gradient }) => (
          <div key={label} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-lg flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`text-4xl md:text-5xl font-black mb-1 bg-gradient-to-br ${gradient} bg-clip-text text-transparent drop-shadow-sm`}>
              {value}
            </div>
            <div className="text-xs md:text-sm font-semibold text-slate-300 tracking-wide uppercase">{label}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 mb-12 shadow-lg">
        <div className="text-xs font-semibold text-slate-400 tracking-widest uppercase mb-4">
          Promise Fulfillment Progress
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
          <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative group" style={{ width: `${pctFulfilled}%` }}>
            {pctFulfilled > 5 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-950">{pctFulfilled}%</span>}
          </div>
          <div className="h-full bg-blue-500 transition-all duration-1000 ease-out relative group" style={{ width: `${pctInProgress}%` }}>
            {pctInProgress > 5 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-950">{pctInProgress}%</span>}
          </div>
          <div className="h-full bg-rose-500 transition-all duration-1000 ease-out relative group" style={{ width: `${pctBroken}%` }}>
            {pctBroken > 5 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-rose-950">{pctBroken}%</span>}
          </div>
          <div className="h-full bg-slate-700 transition-all duration-1000 ease-out" style={{ width: `${pctPending}%` }} />
        </div>
        <div className="flex flex-wrap gap-6 mt-4">
          {[
            { color: 'bg-emerald-500', label: 'Fulfilled', pct: pctFulfilled },
            { color: 'bg-blue-500', label: 'In Progress', pct: pctInProgress },
            { color: 'bg-rose-500', label: 'Broken', pct: pctBroken },
            { color: 'bg-slate-500', label: 'Pending', pct: pctPending },
          ].map(({ color, label, pct: p }) => (
            <div key={label} className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              {label} ({p}%)
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-mono text-slate-500 tracking-widest mr-2">FILTER:</span>
          {[
            { key: 'all', label: 'ALL', color: 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300' },
            { key: 'pending', label: 'PENDING', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
            { key: 'in_progress', label: 'IN PROGRESS', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
            { key: 'fulfilled', label: 'FULFILLED', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' },
            { key: 'broken', label: 'BROKEN', color: 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' },
          ].map(({ key, label, color }) => {
            const isActive = statusFilter === key
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all border backdrop-blur-sm ${
                  isActive 
                    ? key === 'all' ? 'bg-white text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : `bg-${color.split('-')[1]}-500 text-white border-transparent shadow-[0_0_15px_rgba(var(--tw-colors-${color.split('-')[1]}-500),0.4)]`
                    : color
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search promises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-64 bg-slate-900/50 border border-slate-800 text-slate-200 text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all placeholder:text-slate-600 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* PROMISE CARDS BY CATEGORY */}
      <div className="space-y-16">
        {sortedCategories.map(cat => (
          <div key={cat} className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-slate-200 shrink-0">
                {(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent" />
              <span className="text-xs font-mono text-slate-500 shrink-0">
                {grouped[cat].length} PROMISE{grouped[cat].length !== 1 ? 'S' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {grouped[cat].map(p => {
                const statusColor = getStatusColor(p.status)
                const statusGradient = getStatusGradient(p.status)
                return (
                  <Link href={`/promises/${p.id}`} key={p.id} className="group block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:bg-slate-800/60 hover:border-slate-700 relative overflow-hidden flex flex-col">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${statusGradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <span className="bg-slate-950/50 border border-slate-800 px-2 py-1 rounded text-[9px] font-mono text-slate-400 tracking-widest uppercase shadow-inner">
                        {p.category}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border backdrop-blur-sm ${statusColor}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-slate-200 leading-relaxed mb-4 flex-1 group-hover:text-white transition-colors">
                      {p.promise_text}
                    </div>

                    {p.status_evidence && (
                      <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-4 mb-4 shadow-inner">
                        <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2 flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Current Reality
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed">
                          {p.status_evidence}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                      <span className="text-[10px] font-mono text-slate-500">
                        Promised: <span className="text-slate-400">
                          {new Date(p.made_on).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        {p.feasibility && FEASIBILITY_LABELS[p.feasibility] && (
                          <span className={`text-[9px] font-bold tracking-widest uppercase ${FEASIBILITY_LABELS[p.feasibility].color}`}>
                            {FEASIBILITY_LABELS[p.feasibility].label}
                          </span>
                        )}
                        {p.impact_level === 'high' && (
                          <span className="text-[9px] font-bold tracking-widest uppercase text-rose-400">
                            High Impact
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-32 text-slate-500 relative z-10 bg-slate-900/20 rounded-3xl border border-slate-800/50 border-dashed mt-8">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-lg">No promises match your search.</p>
        </div>
      )}

      {/* BROKEN PROMISE LOG */}
      {brokenPromises.length > 0 && (
        <div className="mt-24 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-rose-400 shrink-0">
              BROKEN PROMISE LOG
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-rose-900/50 to-transparent" />
            <span className="text-xs font-mono text-slate-500 shrink-0">
              {brokenPromises.length} DOCUMENTED
            </span>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-mono tracking-widest uppercase text-slate-500">
                    <th className="px-6 py-4 font-medium w-32">Date Promised</th>
                    <th className="px-6 py-4 font-medium">Promise</th>
                    <th className="px-6 py-4 font-medium">Documented Evidence</th>
                    <th className="px-6 py-4 font-medium w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {brokenPromises.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-rose-400 font-mono text-xs">
                        {new Date(p.made_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 text-slate-200 font-medium min-w-[250px]">{p.promise_text}</td>
                      <td className="px-6 py-5 text-slate-400 leading-relaxed min-w-[300px]">{p.status_evidence}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 backdrop-blur-sm">
                          Broken
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
