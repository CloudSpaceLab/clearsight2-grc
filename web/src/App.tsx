import { useEffect, useMemo, useRef, useState } from 'react'

type Status = 'source_identified' | 'verification_pending'
type Framework = {
  id: string
  title: string
  edition: string
  jurisdiction: 'NG' | 'KE' | 'ZA' | 'GH' | 'EU'
  sectors: string[]
  issuer: string
  source_url: string
  source_status: Status
  content_status: 'metadata_only'
  license: 'link_only'
  requirements: string[]
}
type CatalogResult = { seed_revision: string; total: number; items: Framework[] }
type Screen = 'overview' | 'frameworks'
type LoadState = 'loading' | 'ready' | 'unavailable'

const regions: Record<Framework['jurisdiction'], string> = {
  NG: 'Nigeria', KE: 'Kenya', ZA: 'South Africa', GH: 'Ghana', EU: 'European Union',
}
const sectorLabels: Record<string, string> = {
  banking: 'Banking', fintech: 'Fintech', privacy: 'Privacy',
  telecom: 'Telecom', 'oil-gas': 'Oil & Gas', 'cross-sector': 'Cross-sector',
}
const menu = [
  { label: 'Overview', id: 'overview', symbol: '◈', enabled: true },
  { label: 'Programs', id: 'programs', symbol: '▤', enabled: false },
  { label: 'Framework Library', id: 'frameworks', symbol: '◧', enabled: true },
  { label: 'Work', id: 'work', symbol: '☷', enabled: false },
  { label: 'Insights', id: 'insights', symbol: '▥', enabled: false },
  { label: 'Reports', id: 'reports', symbol: '▧', enabled: false },
  { label: 'Configure', id: 'configure', symbol: '⚙', enabled: false },
] as const

function isFrameworkArray(input: unknown): input is CatalogResult {
  if (!input || typeof input !== 'object') return false
  const value = input as Partial<CatalogResult>
  return typeof value.seed_revision === 'string' && Array.isArray(value.items) &&
    value.items.every(f => !!f && typeof f.id === 'string' && typeof f.title === 'string' &&
      typeof f.source_url === 'string' && Array.isArray(f.sectors))
}

function App() {
  const [screen, setScreen] = useState<Screen>('frameworks')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [jurisdiction, setJurisdiction] = useState('')
  const [sector, setSector] = useState('')
  const [query, setQuery] = useState('')
  const [verification, setVerification] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [catalog, setCatalog] = useState<CatalogResult | null>(null)
  const [refresh, setRefresh] = useState(0)
  const selectionRef = useRef<HTMLButtonElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetch('/api/v1/frameworks', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async response => {
        if (!response.ok) throw new Error('Catalog service unavailable')
        const body: unknown = await response.json()
        if (!isFrameworkArray(body)) throw new Error('Invalid catalog response')
        return body
      })
      .then(body => { setCatalog(body); setState('ready') })
      .catch(() => { if (!controller.signal.aborted) { setCatalog(null); setState('unavailable') } })
    return () => controller.abort()
  }, [refresh])

  const visible = useMemo(() => {
    if (!catalog) return []
    const term = query.trim().toLowerCase()
    return catalog.items.filter(f =>
      (!jurisdiction || f.jurisdiction === jurisdiction) &&
      (!sector || f.sectors.includes(sector)) &&
      (verification === 'all' || f.source_status === verification) &&
      (!term || [f.title, f.id, f.edition, f.issuer].some(v => v.toLowerCase().includes(term)))
    ).sort((a, b) => a.title.localeCompare(b.title))
  }, [catalog, jurisdiction, sector, query, verification])
  const detail = catalog?.items.find(f => f.id === selected) ?? null

  useEffect(() => {
    if (!selected) return
    detailRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelected(null)
        selectionRef.current?.focus()
      }
      if (event.key === 'Tab') {
        const focusable = detailRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')
        if (!focusable?.length) { event.preventDefault(); return }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [selected])
  function closeDetails() {
    setSelected(null)
    selectionRef.current?.focus()
  }
  function switchScreen(value: Screen) {
    setScreen(value)
    setSelected(null)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  return <div className="frame" data-theme={theme}>
    <a href="#main" className="skip-link">Skip to content</a>
    <aside className="rail" aria-label="Main navigation">
      <div className="logo-line">
        <span className="brand-symbol" aria-hidden="true"><i /><b /><em /></span>
        <span><strong>ClearSight</strong><small>GOVERNANCE & RISK</small></span>
        <span className="generation">2</span>
      </div>
      <div className="rail-caption">WORKSPACE</div>
      <nav className="rail-nav">
        {menu.map(item => item.enabled
          ? <button key={item.id} type="button" className={screen === item.id ? 'nav-entry active' : 'nav-entry'}
              aria-current={screen === item.id ? 'page' : undefined}
              onClick={() => switchScreen(item.id as Screen)}>
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}
            </button>
          : <span key={item.id} className="nav-entry disabled" aria-disabled="true"
              title="Requires authorized backend workflows">
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}
            </span>)}
      </nav>
      <div className="rail-bottom">
        <span className="small-caps">ENVIRONMENT</span>
        <strong>Foundation preview</strong>
        <p>Catalog metadata only. Operational records and compliance scoring are not connected.</p>
        <span className="rail-foot">ClearSight 2 · 2026</span>
      </div>
    </aside>
    <div className="main-column">
      <header className="toolbar">
        <div className="crumb">ClearSight <span>/</span> {screen === 'frameworks' ? 'Framework Library' : 'Overview'}</div>
        <div className="toolbar-actions">
          <span className="scope-label">Organization</span>
          <button className="scope-choice" type="button" disabled title="Tenant and group access must be authorized by the backend">Not connected <span aria-hidden="true">⌄</span></button>
          <button type="button" className="theme-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title="Switch theme">{theme === 'light' ? '◐' : '◑'}</button>
          <span className="user-avatar" aria-label="Not signed in">—</span>
        </div>
      </header>
      <main className="main-content" id="main">
        {screen === 'overview' ? <section className="overview">
          <div className="page-head">
            <div><div className="eyebrow">OVERSIGHT</div><h1 ref={headingRef} tabIndex={-1}>Enterprise Control Tower</h1>
              <p>Connect an authorized organization to see current risk, compliance and work.</p></div>
          </div>
          <div className="metric-grid" aria-label="No operational metrics available">
            {['Compliance posture', 'Open issues', 'Pending reviews', 'Current evidence'].map(m =>
              <div className="surface metric" key={m}><span className="metric-name">{m}</span><strong>—</strong><small>Not connected</small></div>)}
          </div>
          <section className="surface callout"><h2>No organization connected</h2>
            <p>Operational measures require verified tenant scope and source-backed calculations. No example values are displayed.</p>
            <button className="primary action" type="button" onClick={() => switchScreen('frameworks')}>Browse framework references <span aria-hidden="true">→</span></button>
          </section>
        </section> : <section>
          <div className="page-head">
            <div>
              <div className="eyebrow">PROGRAMS <span className="eyebrow-separator">/</span> REFERENCE</div>
              <h1 ref={headingRef} tabIndex={-1}>Framework Library</h1>
              <p>Explore regulatory frameworks and published standards by jurisdiction and sector.</p>
            </div>
            <div className="head-meta"><span className="label-chip">Metadata only</span><span>Source-linked editions</span></div>
          </div>
          <div className="intro-band">
            <span className="intro-symbol" aria-hidden="true">◈</span>
            <div><strong>Build a Program from verified requirements</strong>
              <p>Sources are listed for discovery. Clause coverage and adopted editions require independent review.</p></div>
            <button className="action disabled-action" disabled type="button" title="Program adoption requires governed mappings and approval">Add to Program</button>
          </div>
          <div className="section-heading"><div><h2>Reference editions</h2><p>Source identification is not approval for assessment.</p></div>
            <span className="result-count" aria-live="polite">{state === 'ready' ? `${visible.length} of ${catalog?.total ?? 0} entries` : 'Not available'}</span>
          </div>
          <div className="surface library-panel">
            <div className="filter-bar">
              <label className="search-wrap"><span className="sr-only">Search frameworks</span>
                <span aria-hidden="true">⌕</span><input type="search" placeholder="Search frameworks or regulators"
                  value={query} onChange={e => setQuery(e.currentTarget.value)} /></label>
              <label className="field-select"><span className="sr-only">Jurisdiction</span>
                <select value={jurisdiction} onChange={e => setJurisdiction(e.currentTarget.value)}>
                  <option value="">All jurisdictions</option>{Object.entries(regions).map(([id,name]) => <option value={id} key={id}>{name}</option>)}
                </select></label>
              <label className="field-select"><span className="sr-only">Industry</span>
                <select value={sector} onChange={e => setSector(e.currentTarget.value)}>
                  <option value="">All industries</option>{Object.entries(sectorLabels).map(([id,name]) => <option value={id} key={id}>{name}</option>)}
                </select></label>
              <label className="field-select"><span className="sr-only">Verification state</span>
                <select value={verification} onChange={e => setVerification(e.currentTarget.value)}>
                  <option value="all">All source states</option><option value="source_identified">Source identified</option><option value="verification_pending">Verification pending</option>
                </select></label>
              {(query || jurisdiction || sector || verification !== 'all') && <button type="button" className="reset-link"
                onClick={() => {setQuery('');setJurisdiction('');setSector('');setVerification('all')}}>Clear filters</button>}
            </div>
            {state === 'loading' ? <div className="message"><div className="loading-indicator" aria-hidden="true" />Loading references…</div>
            : state === 'unavailable' ? <div className="message" role="alert"><h3>Catalog unavailable</h3>
                <p>The framework service could not be reached. No cached compliance data is substituted.</p>
                <button className="action" onClick={() => setRefresh(n => n + 1)} type="button">Retry</button></div>
            : visible.length === 0 ? <div className="message"><h3>No matching frameworks</h3><p>Try a different jurisdiction, sector or search.</p></div>
            : <div className="framework-list" role="list">
              {visible.map(f => <div className="framework-row" role="listitem" key={f.id}>
                <span className="framework-mark" aria-hidden="true">{f.jurisdiction}</span>
                <div className="framework-info"><button type="button" className="framework-title"
                  onClick={e => {selectionRef.current = e.currentTarget;setSelected(f.id)}}>{f.title}</button>
                  <div className="framework-meta"><span>{regions[f.jurisdiction]}</span><span aria-hidden="true">·</span>
                    <span>{f.issuer}</span><span aria-hidden="true">·</span><span>{f.edition}</span></div></div>
                <span className={f.source_status === 'source_identified' ? 'status-pill found' : 'status-pill waiting'}>
                  {f.source_status === 'source_identified' ? 'Source identified' : 'Verify source'}</span>
                <button className="inspect" type="button" onClick={e => {selectionRef.current=e.currentTarget;setSelected(f.id)}}
                  aria-label={`Inspect ${f.title}`}>Inspect <span aria-hidden="true">→</span></button>
              </div>)}
            </div>}
            <div className="panel-footer">Catalog seed {catalog?.seed_revision ?? 'unavailable'} · No obligations adopted or scored</div>
          </div>
        </section>}
      </main>
    </div>
    {detail && <div className="details-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeDetails() }}>
      <aside className="details" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex={-1} ref={detailRef}>
        <div className="detail-top"><span className="eyebrow">REFERENCE EDITION</span>
          <button className="close-button" type="button" onClick={closeDetails} aria-label="Close edition details">×</button></div>
        <h2 id="detail-title">{detail.title}</h2><p className="detail-summary">Reference metadata and provenance</p>
        <dl className="detail-fields">
          <div><dt>Jurisdiction</dt><dd>{regions[detail.jurisdiction]}</dd></div>
          <div><dt>Edition</dt><dd>{detail.edition}</dd></div>
          <div><dt>Issuer</dt><dd>{detail.issuer}</dd></div>
          <div><dt>Industries</dt><dd>{detail.sectors.map(s => sectorLabels[s] ?? s).join(', ')}</dd></div>
          <div><dt>Source status</dt><dd>{detail.source_status === 'source_identified' ? 'Source identified' : 'Verification pending'}</dd></div>
          <div><dt>Requirements</dt><dd>Not imported or approved</dd></div>
          <div><dt>Use rights</dt><dd>Link only; source text is not redistributed</dd></div>
        </dl>
        <div className="detail-notice"><strong>Not yet assessable</strong>
          <p>An authorized reviewer must verify the edition, requirements, licensing and applicability before adoption.</p></div>
        <a className="primary action source-action" href={detail.source_url} target="_blank" rel="noopener noreferrer">
          Open source <span aria-hidden="true">↗</span></a>
      </aside>
    </div>}
  </div>
}
export default App
