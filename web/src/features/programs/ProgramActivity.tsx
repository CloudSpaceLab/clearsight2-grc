import { useCallback, useEffect, useRef, useState } from 'react'
import { RecordDialog } from './RecordDialog'
import { DocumentInspection, documentContentPath } from './DocumentInspection'
import type { ProgramDocument } from './DocumentInspection'
import { v1 } from './v1Client'
import type { V1Context } from './v1Client'
import { activityCategories, activityEventTypes, activityLabel, activityPath, activityRecordTarget, loadActivityExport, validActivityDates } from './programActivityModel'
import type { ActivityCategory, ActivityFilters, ActivityPage, ProgramActivityEvent } from './programActivityModel'
import type { OverviewTarget } from './OverviewPanel'

type Props = { context: V1Context; programId: string; days: number; exportRef: { current: (() => void) | null }; onOpen: (target: OverviewTarget) => void }
const initialFilters = (): ActivityFilters => {
  const q = new URLSearchParams(window.location.search), category = q.get('activity_type') || ''
  return { search: q.get('activity_search') || '', category: Object.hasOwn(activityCategories, category) ? category as ActivityCategory : '', event_type: q.get('activity_event') || '', from: q.get('activity_from') || '', to: q.get('activity_to') || '' }
}
export function ProgramActivity({ context, programId, days, exportRef, onOpen }: Props) {
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState<ActivityPage>()
  const [loading, setLoading] = useState(false), [more, setMore] = useState(false), [error, setError] = useState('')
  const [retry, setRetry] = useState(0), [selected, setSelected] = useState<ProgramActivityEvent>()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [document, setDocument] = useState<ProgramDocument>(), [documentBusy, setDocumentBusy] = useState(false), [documentError, setDocumentError] = useState('')
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  const generation = useRef(0), exportBusy = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++ } }, [])
  const periodFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const effective = { ...filters, from: filters.from || periodFrom }
  const queryKey = JSON.stringify(effective), invalid = !validActivityDates(effective)
  const currentQuery = useRef(queryKey); currentQuery.current = queryKey
  useEffect(() => { setFilters(initialFilters()) }, [days])
  useEffect(() => {
    const sync = () => setFilters(initialFilters())
    window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync)
  }, [])
  function change(key: keyof ActivityFilters, value: string) {
    setFilters(previous => ({ ...previous, [key]: value }))
    const url = new URL(window.location.href), name = { search: 'activity_search', category: 'activity_type', event_type: 'activity_event', from: 'activity_from', to: 'activity_to' }[key]
    if (value) url.searchParams.set(name, value); else url.searchParams.delete(name)
    window.history.replaceState(null, '', url)
  }
  useEffect(() => {
    const token = ++generation.current, abort = new AbortController()
    setPage(undefined); setError(''); setExportError(''); setLoading(!invalid); setMore(false)
    if (invalid) return
    const timer = setTimeout(() => {
      void v1<ActivityPage>(activityPath(programId, JSON.parse(queryKey)), { signal: abort.signal })
        .then(value => { if (token === generation.current) setPage(value) })
        .catch(e => { if (!abort.signal.aborted && token === generation.current) setError(e instanceof Error ? e.message : 'History could not be loaded.') })
        .finally(() => { if (token === generation.current) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); abort.abort() }
  }, [programId, context.actor.id, queryKey, retry, invalid])
  async function loadMore() {
    if (!page?.next_cursor || more) return
    const token = generation.current; setMore(true); setError('')
    try {
      const next = await v1<ActivityPage>(activityPath(programId, effective, page.next_cursor))
      if (token === generation.current) setPage(previous => previous ? { ...next, items: [...previous.items, ...next.items.filter(item => !previous.items.some(old => old.id === item.id))] } : next)
    } catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : 'Older events could not be loaded.') }
    finally { if (token === generation.current) setMore(false) }
  }
  const exportItems = useCallback(async () => {
    if (invalid || exportBusy.current) return
    exportBusy.current = true; setExporting(true); setExportError('')
    const key = queryKey
    try {
      const result = await loadActivityExport(programId, JSON.parse(key), path => v1<ActivityPage>(path), () => mounted.current && key === currentQuery.current)
      if (!result) return
      const value = { program_id: programId, generated_at: new Date().toISOString(), ...result, complete: true, filters: { ...JSON.parse(key), time_zone: 'UTC' } }
      const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `program-${programId}-activity.json`; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { if (mounted.current && key === currentQuery.current) setExportError(e instanceof Error ? e.message : 'History could not be exported. Try again.') }
    finally { exportBusy.current = false; if (mounted.current) setExporting(false) }
  }, [programId, queryKey, invalid])
  useEffect(() => { exportRef.current = () => { void exportItems() }; return () => { exportRef.current = null } }, [exportItems, exportRef])
  async function openDocument(item: ProgramActivityEvent) {
    setDocumentBusy(true); setDocumentError('')
    const token = generation.current
    try {
      let cursor = '', found: ProgramDocument | undefined
      do {
        const params = new URLSearchParams({ submission_id: item.submission_id!, current_only: 'false', limit: '100' })
        if (cursor) params.set('cursor', cursor)
        const result = await v1<{ items: ProgramDocument[]; next_cursor?: string }>('/api/v1/forms/documents?' + params)
        found = result.items.find(doc => doc.artifact_id === item.artifact_id && doc.field_id === item.field_id)
        cursor = result.next_cursor || ''
      } while (cursor && !found && mounted.current && generation.current === token)
      if (!mounted.current || generation.current !== token) return
      if (!found) throw Error('This document is unavailable to this account. Its recorded event remains in history.')
      setDocument(found)
    } catch (e) { if (mounted.current && generation.current === token) setDocumentError(e instanceof Error ? e.message : 'Document could not be loaded.') }
    finally { if (mounted.current) setDocumentBusy(false) }
  }
  const items = page?.items || []
  return <section className="surface program-activity-register" aria-busy={loading}>
    <div className="surface-heading"><div><h2>Program event history</h2><p>Newest first · Dates and times shown in UTC</p></div><span aria-live="polite">{invalid ? 'Check date range' : page ? `${items.length}${page.next_cursor ? '+' : ''} ${items.length === 1 ? 'record' : 'records'}` : error ? 'History unavailable' : 'Loading history'}</span></div>
    <div className="program-activity-filter-toggle"><button type="button" className="button" aria-expanded={filtersOpen} aria-controls="program-activity-filters" onClick={() => setFiltersOpen(open => !open)}>{filtersOpen ? 'Hide filters' : 'Filter history'}</button><small>{filters.search || filters.category || filters.event_type || filters.from || filters.to ? 'Filters applied' : `Last ${days} days`}</small></div>
    <div id="program-activity-filters" className={`program-register-tools program-register-inset${filtersOpen ? ' is-open' : ''}`}>
      <label className="program-field">Search history<input type="search" maxLength={200} value={filters.search} onChange={e => change('search', e.target.value)} placeholder="Actor, record or event"/></label>
      <label className="program-field">Record type<select value={filters.category} onChange={e => change('category', e.target.value)}><option value="">All records</option>{Object.entries(activityCategories).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label className="program-field">Event type<select value={filters.event_type || ''} onChange={e => change('event_type', e.target.value)}><option value="">All events</option>{[...new Set([...activityEventTypes, ...items.map(item => item.event), ...(filters.event_type ? [filters.event_type] : [])])].sort((a,b) => activityLabel(a).localeCompare(activityLabel(b))).map(event => <option key={event} value={event}>{activityLabel(event)}</option>)}</select></label>
      <label className="program-field">From date (UTC)<input type="date" value={effective.from} onInput={e => change('from', e.currentTarget.value)}/></label>
      <label className="program-field">To date (UTC)<input type="date" value={filters.to} onInput={e => change('to', e.currentTarget.value)}/></label>
    </div>
    <div className="program-activity-context"><p>Program, assessment, document, schedule and issue events available to your account.</p><button className="text-link" type="button" disabled={loading || more} onClick={() => setRetry(value => value + 1)}>Refresh history</button></div>
    {invalid && <p role="alert" className="program-context-empty">The end date must be on or after the start date.</p>}
    {error && <p role="alert" className="program-context-empty">{error} <button className="text-link" type="button" onClick={() => page ? void loadMore() : setRetry(value => value + 1)}>Try again</button></p>}
    {exportError && <p role="alert" className="program-context-empty">{exportError}</p>}
    {exporting && <p role="status" className="program-context-empty">Preparing all events matching these filters…</p>}
    {loading && <p role="status" className="program-context-empty">Loading authorized history…</p>}
    <ol className="program-activity-timeline">{items.map(item => <li key={item.id}><div>
      <strong>{item.title}</strong><span>{activityLabel(item.event)}{typeof item.details.status === 'string' && ` · ${activityLabel(item.details.status)}`}{typeof item.details.outcome === 'string' && ` · ${activityLabel(item.details.outcome)}`} · {item.actor_name}</span>
      <small>{activityCategories[item.category]} · <time dateTime={item.at}>{new Date(item.at).toISOString().replace('T', ' ').slice(0, 19)} UTC</time>{typeof item.details.revision === 'number' && ` · Response revision ${item.details.revision}`}</small>
      <div><button type="button" className="text-link" onClick={() => { setSelected(item); setDocument(undefined); setDocumentError('') }}>View event</button>{' · '}
        <button type="button" className="text-link" onClick={() => {
          if (item.category === 'DOCUMENT' && item.submission_id && item.artifact_id) { setSelected(item); setDocument(undefined); void openDocument(item) }
          else onOpen(activityRecordTarget(item))
        }}>{item.category === 'DOCUMENT' && item.submission_id && item.artifact_id ? 'Inspect document' : item.category === 'ISSUE' ? 'Open issue' : item.category === 'SCHEDULE' ? 'Open schedule' : item.details.request_kind === 'DOCUMENT_REQUEST' ? 'Open document request' : item.request_id ? 'Open assessment' : 'Open Program overview'}</button></div>
    </div></li>)}</ol>
    {page && !items.length && !invalid && <p className="program-context-empty" role="status">No events available to your account match this period and these filters.</p>}
    {page?.next_cursor && <div className="program-context-empty"><button className="button" type="button" disabled={more} onClick={() => void loadMore()}>{more ? 'Loading older events…' : 'Load older events'}</button></div>}
    {page && <p className="program-context-empty"><small>History through {new Date(page.through).toISOString().replace('T', ' ').slice(0, 19)} UTC. Refresh to include newer events.</small></p>}
    {selected && <RecordDialog title={activityLabel(selected.event)} onClose={() => { setSelected(undefined); setDocument(undefined) }}>
      <h3>{selected.title}</h3><dl className="program-document-facts">
        <div><dt>Record type</dt><dd>{activityCategories[selected.category]}</dd></div><div><dt>Actor</dt><dd>{selected.actor_name}</dd></div>
        <div><dt>Recorded at</dt><dd>{new Date(selected.at).toISOString()}</dd></div>
        {Object.entries(selected.details).filter(([key, value]) => key !== 'request_kind' && value !== null && value !== '').map(([key, value]) => <div key={key}><dt>{key === 'review_id' ? 'Review reference' : activityLabel(key)}</dt><dd>{['status','state','outcome'].includes(key) ? activityLabel(String(value)) : String(value)}</dd></div>)}
        <div><dt>Event reference</dt><dd>{selected.id}</dd></div><div><dt>Record reference</dt><dd>{selected.record_id}</dd></div>
        {selected.submission_id && <div><dt>Response reference</dt><dd>{selected.submission_id}</dd></div>}
      </dl>
      {selected.category === 'DOCUMENT' && selected.submission_id && <button type="button" className="button" disabled={documentBusy} onClick={() => void openDocument(selected)}>{documentBusy ? 'Loading document…' : 'Inspect this document'}</button>}
      {documentError && <p role="alert">{documentError}</p>}
      {document && <><h3>{document.file_name}</h3><DocumentInspection document={document} context={context} programId={programId}/>
        {(document.artifact_status === 'AVAILABLE' || document.demo_unscanned_allowed || document.demo_preview_available) && <a className="button" href={documentContentPath(document) + '&download=true'}>Download original</a>}</>}
      <button className="button" type="button" onClick={() => onOpen(activityRecordTarget(selected))}>Open linked {selected.category === 'ISSUE' ? 'issue' : selected.category === 'SCHEDULE' ? 'schedule' : selected.details.request_kind === 'DOCUMENT_REQUEST' ? 'document request' : selected.request_id ? 'assessment' : 'Program'}</button>
    </RecordDialog>}
  </section>
}
