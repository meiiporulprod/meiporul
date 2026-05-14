'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from '../app/promises/tracker.module.css'
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

function cardVariant(status: string) {
  switch (status) {
    case 'pending':     return styles.cardPending
    case 'in_progress': return styles.cardInProgress
    case 'fulfilled':   return styles.cardFulfilled
    case 'broken':      return styles.cardBroken
    default:            return styles.cardUnclear
  }
}

function badgeVariant(status: string) {
  switch (status) {
    case 'pending':     return styles.badgePending
    case 'in_progress': return styles.badgeInProgress
    case 'fulfilled':   return styles.badgeFulfilled
    case 'broken':      return styles.badgeBroken
    default:            return styles.badgeUnclear
  }
}

const FEASIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  fulfillable:   { label: "Fulfillable",           color: "#22c55e" },
  partial:       { label: "Partially Fulfillable",  color: "#eab308" },
  blocked:       { label: "Structurally Blocked",   color: "#a855f7" },
  unfulfillable: { label: "Not Fulfillable",        color: "#ef4444" },
}

function realityVariant(status: string) {
  switch (status) {
    case 'pending':     return styles.realityPending
    case 'in_progress': return styles.realityInProgress
    case 'fulfilled':   return styles.realityFulfilled
    case 'broken':      return styles.realityBroken
    default:            return styles.realityUnclear
  }
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
    <div className={styles.page}>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brand}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div className={styles.brandLabel}>MEIPORUL · TRUTH REGISTER</div>
            </Link>
            <h1 className={styles.h1}>
              VIJAY / TVK<br />
              <span>PROMISE</span> TRACKER
            </h1>
            <p className={styles.tagline}>
              40-point manifesto, Tamil Nadu 2026. Every promise tracked against documented evidence.
              No spin — just the record.
            </p>
          </div>
          <div className={styles.headerMeta}>
            <div className={styles.liveBadge}>
              <div className={styles.liveDot} />
              LIVE TRACKING
            </div>
            <div className={styles.lastUpdated}>Last updated: {lastUpdated}</div>
          </div>
        </div>
      </header>

      {/* STATS BAR */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.cTotal}`}>{stats.total}</div>
          <div className={styles.statLabel}>Total Promises</div>
          <div className={styles.statSub}>From 40-point manifesto</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.cPending}`}>{stats.pending}</div>
          <div className={styles.statLabel}>Pending</div>
          <div className={styles.statSub}>No action taken</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.cPartial}`}>{stats.inProgress}</div>
          <div className={styles.statLabel}>In Progress</div>
          <div className={styles.statSub}>Partial action</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.cKept}`}>{stats.fulfilled}</div>
          <div className={styles.statLabel}>Fulfilled</div>
          <div className={styles.statSub}>Fully delivered</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.cBroken}`}>{stats.broken}</div>
          <div className={styles.statLabel}>Broken</div>
          <div className={styles.statSub}>Contradicted by evidence</div>
        </div>
      </div>

      {/* PROGRESS */}
      <div className={styles.progressContainer}>
        <div className={styles.progressLabel}>PROMISE FULFILLMENT PROGRESS</div>
        <div className={styles.progressBar}>
          <div className={styles.progressKept}    style={{ width: `${pctFulfilled}%` }} />
          <div className={styles.progressPartial} style={{ width: `${pctInProgress}%` }} />
          <div className={styles.progressBroken}  style={{ width: `${pctBroken}%` }} />
          <div className={styles.progressPending} style={{ width: `${pctPending}%` }} />
        </div>
      </div>
      <div className={styles.legend}>
        {[
          { color: '#22c55e', label: 'Fulfilled',   pct: pctFulfilled },
          { color: '#3b82f6', label: 'In Progress', pct: pctInProgress },
          { color: '#ff3c3c', label: 'Broken',      pct: pctBroken },
          { color: '#4a4a6a', label: 'Pending',     pct: pctPending },
        ].map(({ color, label, pct: p }) => (
          <div key={label} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: color }} />
            {label} ({p}%)
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className={styles.filters}>
        <span className={styles.filterLabel}>FILTER:</span>
        {[
          { key: 'all',        label: 'ALL',         cls: '' },
          { key: 'pending',    label: 'PENDING',     cls: styles.filterBtnPending },
          { key: 'in_progress',label: 'IN PROGRESS', cls: styles.filterBtnPartial },
          { key: 'fulfilled',  label: 'FULFILLED',   cls: styles.filterBtnKept },
          { key: 'broken',     label: 'BROKEN',      cls: styles.filterBtnBroken },
        ].map(({ key, label, cls }) => (
          <button
            key={key}
            className={[
              styles.filterBtn,
              cls,
              statusFilter === key ? styles.filterBtnActive : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </button>
        ))}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search promises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* PROMISE CARDS BY CATEGORY */}
      {sortedCategories.map(cat => (
        <div key={cat}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              {(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}
            </span>
            <div className={styles.sectionLine} />
            <span className={styles.sectionCount}>
              {grouped[cat].length} PROMISE{grouped[cat].length !== 1 ? 'S' : ''}
            </span>
          </div>
          <div className={styles.grid}>
            {grouped[cat].map(p => (
              <div key={p.id} className={`${styles.card} ${cardVariant(p.status)}`}>
                <div className={styles.cardTop}>
                  <span className={styles.categoryTag}>{p.category.toUpperCase()}</span>
                  <span className={`${styles.badge} ${badgeVariant(p.status)}`}>
                    <span className={styles.badgeDot} />
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
                <div className={styles.promiseTitle}>{p.promise_text}</div>
                {p.status_evidence && (
                  <div className={`${styles.reality} ${realityVariant(p.status)}`}>
                    <div className={styles.realityLabel}>CURRENT REALITY</div>
                    {p.status_evidence}
                  </div>
                )}
                <div className={styles.cardFooter}>
                  <span className={styles.deadline}>
                    Promised:{' '}
                    <span>
                      {new Date(p.made_on).toLocaleDateString('en-IN', {
                        month: 'short', year: 'numeric',
                      })}
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {p.feasibility && FEASIBILITY_LABELS[p.feasibility] && (
                      <span
                        className={styles.categoryTag}
                        style={{ color: FEASIBILITY_LABELS[p.feasibility].color }}
                      >
                        {FEASIBILITY_LABELS[p.feasibility].label.toUpperCase()}
                      </span>
                    )}
                    {p.impact_level === 'high' && (
                      <span className={styles.categoryTag}>HIGH IMPACT</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: '#5a5a7a', position: 'relative', zIndex: 10 }}>
          No promises match your search.
        </div>
      )}

      {/* BROKEN PROMISE LOG */}
      {brokenPromises.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>BROKEN PROMISE LOG</span>
            <div className={styles.sectionLine} />
            <span className={styles.sectionCount}>{brokenPromises.length} DOCUMENTED</span>
          </div>
          <div className={styles.logSection}>
            <table className={styles.logTable}>
              <thead>
                <tr>
                  <th>DATE PROMISED</th>
                  <th>PROMISE</th>
                  <th>DOCUMENTED EVIDENCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {brokenPromises.map(p => (
                  <tr key={p.id}>
                    <td>
                      {new Date(p.made_on).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td>{p.promise_text}</td>
                    <td>{p.status_evidence}</td>
                    <td><span className={styles.evidenceTag}>BROKEN</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerNote}>
          <strong>MEIPORUL</strong> is an independent, non-partisan accountability platform.
          All data is sourced from official announcements, government orders, and documented news reports.
          Promise status is updated as evidence emerges.
        </div>
        <button
          className={styles.shareBtn}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Vijay/TVK Promise Tracker — Meiporul', url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
        >
          ↗ SHARE TRACKER
        </button>
      </footer>
    </div>
  )
}
