import { useEffect, useRef, useState } from 'react'
import { useId } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { AssessmentConfiguration } from './AssessmentConfiguration'
import { AssessmentSchedules } from './AssessmentSchedules'
import { AssessmentResponseHistory } from './AssessmentResponseHistory'
import { ProgramAssessmentResponse } from './ProgramAssessmentResponse'
import type { AssessmentHistory, AssessmentReviewReceipt } from './assessmentResponseModel'
import { assessmentHref, assessmentReviewFor } from './assessmentResponseModel'
import { assessmentStatusLabel, reviewStatusTone } from './reviewStatus'
import { isSupportingDocumentRequest, latestRequests, scoped, v1 } from './v1Client'
import type { RequestRecord, Template, V1Context } from './v1Client'
import './assessmentWorkspace.css'

const cycleDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const assessmentDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? cycleDate.format(new Date(value)) : undefined
const tabs = [
  ['questions', 'Questions & responses'],
  ['config', 'Configuration'],
  ['history', 'Response history'],
] as const

type Props = {
  context: V1Context
  programId: string
  requests: RequestRecord[]
  reviews: AssessmentReviewReceipt[]
  templates: Template[]
  selected: string
  openSchedules?: boolean
  loading: boolean
  onSelect: (id: string) => void
  onChanged: () => Promise<void>
  onMessage: (message: string) => void
}

export function ProgramAssessments({ context, programId, requests, reviews, templates, selected, openSchedules, loading, onSelect, onChanged, onMessage }: Props) {
  const assessmentRequests = latestRequests(requests.filter(record => !isSupportingDocumentRequest(record)))
  const record = selected ? assessmentRequests.find(item => item.id === selected) : assessmentRequests[0]
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const state = (item: RequestRecord) => assessmentStatusLabel(item.status, assessmentReviewFor(item, reviews), item.latest_assessment_revision)
  const visible = assessmentRequests.filter(item => {
    const template = templates.find(form => form.id === item.form_template_id && form.version === item.form_template_version)
    return (!status || state(item) === status) &&
      [item.title, item.purpose, item.recipient?.display_name, template?.name, item.collection_period_start, item.collection_period_end]
        .join(' ').toLowerCase().includes(search.trim().toLowerCase())
  })
  function select(id: string) {
    onSelect(id)
    const url = new URL(assessmentHref(programId, id), window.location.origin)
    window.history.replaceState(null, '', url)
    requestAnimationFrame(() => detailHeading.current?.focus())
  }
  return <>
    <div className="program-register-tools assessment-register-tools">
      <label className="program-field">Search assessments<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, form or respondent"/></label>
      <label className="program-field">Status<select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        {['Draft', 'Submitted', 'Changes requested', 'Resubmitted', 'Reviewed', 'Expired'].map(value => <option key={value}>{value}</option>)}
      </select></label>
    </div>
    <div className="program-assessment-workspace">
      <section className="surface program-cycle-browser">
        <div className="surface-heading"><h2>Assessment cycles</h2><small aria-live="polite">{visible.length} {visible.length === 1 ? 'record' : 'records'}</small></div>
        <div className="assessment-cycle-list">
          {visible.map(item => <button type="button" className="program-register-record assessment-cycle-card" key={item.id}
            aria-current={record?.id === item.id} onClick={() => select(item.id)}>
            <strong>{item.title}</strong>
            <small>{item.recipient?.display_name || 'Assigned respondent'} · Due {assessmentDate(item.deadline) || 'Unavailable'}</small>
            <span className="assessment-cycle-footer"><span className={`pill ${reviewStatusTone[state(item)] || ''}`}>{state(item)}</span>
              <span className="program-row-open">Open <span aria-hidden="true">→</span></span></span>
          </button>)}
          {!visible.length && <p className="program-context-empty" role="status">{loading ? 'Loading assessment cycles…' : assessmentRequests.length ? 'No assessments match these filters.' : 'No assessments are available to this account.'}</p>}
        </div>
      </section>
      {record ? <AssessmentDetail key={record.id} context={context} programId={programId} record={record} headingRef={detailHeading}
        status={state(record)} review={assessmentReviewFor(record, reviews)}
        template={templates.find(template => template.id === record.form_template_id && template.version === record.form_template_version)}
        openSchedules={openSchedules} onChanged={onChanged} onMessage={onMessage}/> :
        <section className="surface program-response-workspace"><div className="surface-heading"><h2 ref={detailHeading} tabIndex={-1}>Assessment details</h2></div>
          <div className="program-detail-body"><p role="status">{loading ? 'Loading assessment…' : selected ? 'This assessment is unavailable to this account.' : 'Create or select an assessment to begin.'}</p>
            <AssessmentSchedules context={context} programId={programId} initialOpen={openSchedules}/></div></section>}
    </div>
  </>
}

function AssessmentDetail({ context, programId, record, headingRef, status, review, template, openSchedules, onChanged, onMessage }: {
  context: V1Context
  programId: string
  record: RequestRecord
  headingRef: React.RefObject<HTMLHeadingElement | null>
  status: string
  review?: AssessmentReviewReceipt
  template?: Template
  openSchedules?: boolean
  onChanged: () => Promise<void>
  onMessage: (message: string) => void
}) {
  const [mode, setMode] = useState<(typeof tabs)[number][0]>(new URLSearchParams(window.location.search).has('submission') ? 'history' : openSchedules ? 'config' : 'questions')
  const detailTabs = useWorkspaceTabs(['questions', 'config', 'history'] as const, mode, setMode)
  const id = useId()
  const [state, setState] = useState<{ page: AssessmentHistory; revision?: AssessmentHistory }>()
  const [reload, setReload] = useState(0)
  const [loadError, setLoadError] = useState('')
  const path = scoped(`/api/v1/programs/${encodeURIComponent(programId)}/assessment-responses/${encodeURIComponent(record.id)}`, context)
  const activePage = state?.page.revisions[0]?.id === record.latest_assessment_submission_id ? state : undefined
  const cycle = [assessmentDate(record.collection_period_start), assessmentDate(record.collection_period_end)].filter(Boolean).join(' – ')
  const latestReview = activePage?.revision?.reviews?.[0] || review
  useEffect(() => {
    if (record.status !== 'SUBMITTED') return
    let active = true
    setLoadError('')
    void v1<AssessmentHistory>(path).then(async page => {
      if (!active) return
      setState({ page })
      if (!page.revisions[0]) return
      const revision = await v1<AssessmentHistory>(path + '&submission_id=' + encodeURIComponent(page.revisions[0].id))
      if (active) setState({ page, revision })
    }).catch(e => {
      if (active) setLoadError(e instanceof Error ? e.message : 'Response history could not be loaded.')
    })
    return () => { active = false }
  }, [path, record.status, record.version, review?.id, reload])

  async function changed() {
    await onChanged()
    setReload(value => value + 1)
  }

  const headingStatus = latestReview ? assessmentStatusLabel(record.status, latestReview, record.latest_assessment_revision) : status
  const showHistory = () => {
    setMode('history')
    requestAnimationFrame(() => document.getElementById(id + '-tab-history')?.focus())
  }
  return <section className="surface program-response-workspace" aria-label="Selected assessment">
    <div className="surface-heading assessment-detail-heading">
      <div><div className="eyebrow">{cycle || 'Assessment cycle'} · Request version {record.version}</div>
        <h2 ref={headingRef} tabIndex={-1}>{record.title}</h2>
        <p>{[template?.name || (record.form_template_version ? `Form version ${record.form_template_version}` : undefined),
          record.recipient?.display_name, `Due ${assessmentDate(record.deadline) || 'unavailable'}`].filter(Boolean).join(' · ')}</p>
      </div>
      <span className={`pill ${reviewStatusTone[headingStatus] || ''}`}>{headingStatus}</span>
    </div>
    <div className="program-response-tabs" role="tablist" aria-label="Assessment detail" onKeyDown={detailTabs.onKeyDown}>
      {tabs.map(([key, label], index) => <button type="button" key={key} ref={detailTabs.refAt(index)} role="tab" id={id + '-tab-' + key}
        aria-controls={id + '-panel-' + key} aria-selected={mode === key} tabIndex={mode === key ? 0 : -1} onClick={() => setMode(key)}>{label}</button>)}
    </div>
    {tabs.map(([key]) => <div key={key} className="program-detail-body assessment-detail-body" role="tabpanel"
      id={id + '-panel-' + key} aria-labelledby={id + '-tab-' + key} tabIndex={0} hidden={mode !== key}>
      {key === 'questions' ? <>
        {loadError && <p className="assessment-error" role="alert">{loadError} <button type="button" className="text-link" onClick={() => setReload(value => value + 1)}>Try again</button></p>}
        <ProgramAssessmentResponse context={context} programId={programId} record={record} history={activePage?.page}
          revision={activePage?.revision} currentReview={latestReview} onChanged={changed} onHistory={showHistory}/>
      </> : key === 'config' ? mode === 'config' && <AssessmentConfiguration context={context} programId={programId} record={record}
        template={template} cycle={cycle} initialOpen={openSchedules} onMessage={onMessage}/> : <>
        {loadError && <p className="assessment-error" role="alert">{loadError} <button type="button" className="text-link" onClick={() => setReload(value => value + 1)}>Try again</button></p>}
        {activePage ? <AssessmentResponseHistory key={record.version + ':' + activePage.page.latest_review_version} path={path} page={activePage.page} record={record} context={context}/> :
          !loadError && <p role="status">{record.status === 'SUBMITTED' ? 'Loading response history…' : 'Submitted responses will appear here.'}</p>}
      </>}
    </div>)}
  </section>
}
