import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { command, scoped, v1, V1Error, isSupportingDocumentRequest, latestRequests } from './v1Client'
import type { Answer, Artifact, Field, Receipt, RequestRecord, Submission, Template, V1Context } from './v1Client'
import { V1FieldReview } from './V1FieldReview'
import { RecordDialog } from './RecordDialog'

type Props = { context: V1Context; programId: string; requests: RequestRecord[]; templates: Template[]; selected: string; onSelect: (id: string) => void; section: 'Assessment' | 'Documents' | 'Activity'; activityExportRef: { current: (() => void) | null }; openDocument?: boolean; onDocumentHandled?: () => void; onRefresh: () => Promise<void>; onMessage: (message: string) => void }
type Check = { id: string; name: string; version: number; status: string; is_current: boolean; input_kind?: string; owner_principal_id?: string; form_template_id?: string; collection_policy?: { validity_months: number; renewal_window_days: number; reminder_count: number } }
type Operation = { command: string; subresource_id?: string; can_act: boolean; reason?: string; allowed_targets?: string[] }
type Document = { request_id: string; file_name: string; submission_id: string; field_id: string; artifact_id: string; response_revision_id?: string; artifact_status: string; demo_unscanned_allowed?: boolean; review?: { status: string }; sha256: string; size_bytes: number }

const statusLabel = (status: string) => ({ DRAFT: 'Draft', OPEN: 'Draft', READY: 'Draft', SUBMITTED: 'Submitted', CHANGES_REQUESTED: 'Changes requested', REVIEWED: 'Reviewed', APPROVED: 'Reviewed' }[status] || status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))
const supportedFields = ['short_text', 'long_text', 'text', 'attestation', 'checkbox', 'multi_select', 'single_select', 'yes_no', 'file', 'photo', 'signature', 'integer', 'decimal', 'number', 'percentage', 'currency', 'email', 'url', 'date']

export function V1Responses({ context, programId, requests, templates, selected, onSelect, section, activityExportRef, onRefresh, onMessage, openDocument, onDocumentHandled }: Props) {
  const assessmentRequests = latestRequests(requests.filter(r => !isSupportingDocumentRequest(r)))
  const sectionRequests = section === 'Assessment' ? assessmentRequests : requests
  const record = sectionRequests.find(r => r.id === selected) || sectionRequests[0]
  const [search, setSearch] = useState('')
  const [assessmentStatus, setAssessmentStatus] = useState('')
  const [documentStatus, setDocumentStatus] = useState('')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityType, setActivityType] = useState('')
  const [mode, setMode] = useState<'questions' | 'config' | 'history'>('questions')
  const detailTabs = useWorkspaceTabs(['questions', 'config', 'history'] as const, mode, setMode)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [policyCheck, setPolicyCheck] = useState('')
  const [policyValues, setPolicyValues] = useState({ validity_months: 12, renewal_window_days: 30, reminder_count: 3 })
  const [policyError, setPolicyError] = useState('')
  const [policyBusy, setPolicyBusy] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [documentReviewRevision, setDocumentReviewRevision] = useState('')
  const [documentDialog, setDocumentDialog] = useState(false)
  const [documentRequestOpen, setDocumentRequestOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (openDocument) { setDocumentDialog(true); onDocumentHandled?.() } }, [openDocument, onDocumentHandled])
  useEffect(() => {
    let active = true
    setAnswers({}); setSubmission(null); setReceipt(null); setArtifacts([]); setError('')
    if (record?.status === 'SUBMITTED') void v1<Submission>(scoped(`/api/v1/evidence/requests/${record.id}/review-submission`, context)).then(value => { if (active) { setSubmission(value); setAnswers(value.answers) } }).catch(e => { if (active) setError(e instanceof V1Error && e.status === 404 ? 'Submitted answers are unavailable to this account. Sign in as the assigned reviewer to inspect them.' : 'Unable to load submitted answers. Try again.') })
    return () => { active = false }
  }, [record?.id, record?.version, context])
  const refreshChecks = useCallback(async () => {
    const [checksResult, opsResult] = await Promise.all([
      v1<{ items: Check[] }>(scoped(`/api/v1/programs/${programId}/monitoring-checks?limit=100`, context)),
      v1<{ operations: Operation[] }>(scoped(`/api/v1/programs/${programId}/operations`, context)),
    ])
    setChecks(checksResult.items); setOperations(opsResult.operations)
  }, [programId, context])
  useEffect(() => { let active = true; void refreshChecks().catch(e => { if (active) setError(String(e)) }); return () => { active = false } }, [refreshChecks])
  useEffect(() => {
    let active = true
    void v1<{ items: Document[] }>('/api/v1/forms/documents?limit=100').then(result => { if (active) setDocuments(result.items.filter(d => requests.some(r => r.id === d.request_id))) }).catch(e => { if (active) setError(String(e)) })
    return () => { active = false }
  }, [requests, context.actor.id])
  const policyOwner = checks.find(c => c.id === policyCheck && c.is_current && c.status === 'ACTIVE' && c.input_kind === 'FORM')
  const policyDraft = checks.filter(c => c.id === policyCheck).sort((a, b) => b.version - a.version)[0]
  const pendingOperation = operations.find(o => o.command === 'program.monitoring.transition' && o.subresource_id === policyDraft?.id && o.can_act)
  const canSubmitPolicy = pendingOperation?.allowed_targets?.includes('PENDING_APPROVAL')
  const canApprovePolicy = pendingOperation?.allowed_targets?.includes('ACTIVE')
  const activityRecords = useMemo(() => requests.filter(r => (!activityType || activityType === 'REQUEST_SNAPSHOT') && `${r.title} ${r.id} ${r.status}`.toLowerCase().includes(activitySearch.toLowerCase())).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [requests, activitySearch, activityType])
  const visibleDocuments = documents.filter(d => {
    const request = requests.find(r => r.id === d.request_id)
    const reviewState = d.review ? 'Reviewed' : 'Submitted'
    return `${d.file_name} ${request?.title || ''}`.toLowerCase().includes(search.toLowerCase()) && (!documentStatus || documentStatus === reviewState)
  })
  const documentRequests = requests.filter(r => r.fields.some(f => ['file', 'photo', 'vendor_document'].includes(f.type)))
  const visibleDocumentRequests = documentRequests.filter(r => !documents.some(d => d.request_id === r.id) && `${r.title} ${r.purpose}`.toLowerCase().includes(search.toLowerCase()))
  const exportActivity = useCallback(() => {
    const payload = { program_id: programId, generated_at: new Date().toISOString(), source: 'v1 request snapshots; not a complete audit-event feed', items: activityRecords.map(r => ({ request_id: r.id, title: r.title, status: r.status, version: r.version, updated_at: r.updated_at })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `program-${programId}-request-snapshots.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [activityRecords, programId])
  useEffect(() => { activityExportRef.current = exportActivity; return () => { if (activityExportRef.current === exportActivity) activityExportRef.current = null } }, [activityExportRef, exportActivity])

  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') } finally { setBusy(false) } }
  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!policyOwner) return
    setPolicyBusy(true); setPolicyError('')
    try { await command(scoped(`/api/v1/monitoring-checks/${encodeURIComponent(policyOwner.id)}/collection-policy`, context), { expected_version: policyOwner.version, collection_policy: policyValues }); await refreshChecks(); onMessage('A versioned collection-policy draft was saved. The current policy remains effective until independent approval.') }
    catch (e) { setPolicyError(e instanceof Error ? e.message : 'Policy update failed') } finally { setPolicyBusy(false) }
  }
  async function transitionPolicy(check: Check, to: string) {
    setPolicyBusy(true); setPolicyError('')
    try { await command(scoped(`/api/v1/monitoring-checks/${encodeURIComponent(check.id)}/transition`, context), { expected_version: check.version, to }); await refreshChecks(); onMessage(to === 'ACTIVE' ? 'Collection policy approved and activated by the backend.' : 'Collection policy submitted for independent review.') }
    catch (e) { setPolicyError(e instanceof Error ? e.message : 'Policy transition failed') } finally { setPolicyBusy(false) }
  }
  async function upload(field: Field, file?: File) {
    if (!record || !file) return
    await run(async () => { const data = new FormData(); data.set('request_id', record.id); data.set('field_id', field.id); data.set('file', file); const artifact = await v1<Artifact>('/api/v1/evidence/artifacts', { method: 'POST', body: data }); setArtifacts(prev => [...prev, artifact]); setAnswers(prev => ({ ...prev, [field.id]: { artifact_ids: [artifact.id] } })); onMessage(`File uploaded to v1. Scan status: ${artifact.status}. Submit the response to bind it as evidence.`) })
  }
  function input(field: Field) {
    const value = answers[field.id] || {}
    const set = (answer: Answer) => setAnswers(previous => ({ ...previous, [field.id]: answer }))
    if (!record || !['READY', 'OPEN', 'DRAFT'].includes(record.status) || record.recipient?.principal_id !== context.actor.id) return <p>{record?.status === 'SUBMITTED' && !submission ? 'Submitted answer unavailable to this account.' : record && record.status !== 'SUBMITTED' ? 'Answer available to the assigned respondent.' : value.text || value.values?.join(', ') || value.artifact_ids?.join(', ') || 'No answer recorded'}</p>
    if (field.condition) return <p role="status">This field has conditional rules. Complete it in the v1 governed form workspace.</p>
    if (['file', 'photo', 'signature'].includes(field.type)) return <><input type="file" aria-label={field.label} disabled={busy} onChange={e => void upload(field, e.target.files?.[0])}/><small>{value.artifact_ids?.length ? 'File uploaded. Submit the document to finish.' : 'Choose a file to attach.'}</small></>
    if (field.type === 'attestation' || field.type === 'checkbox') return <label><input type="checkbox" checked={value.text === 'true'} required={field.required} onChange={e => set({ text: e.target.checked ? 'true' : 'false' })}/>{field.attestation || field.label}</label>
    if (field.type === 'multi_select') return <select multiple required={field.required} value={value.values || []} onChange={e => set({ values: Array.from(e.target.selectedOptions).map(o => o.value) })}>{field.options?.map(o => <option key={o}>{o}</option>)}</select>
    if (field.options?.length) return <select required={field.required} value={value.text || ''} onChange={e => set({ text: e.target.value })}><option value="">Choose an answer</option>{field.options.map(o => <option key={o}>{o}</option>)}</select>
    if (['short_text', 'long_text', 'text'].includes(field.type)) return <textarea required={field.required} value={value.text || ''} onChange={e => set({ text: e.target.value })} rows={3}/>
    const type = ['integer', 'decimal', 'number', 'percentage', 'currency'].includes(field.type) ? 'number' : ['email', 'url', 'date'].includes(field.type) ? field.type : ''
    return type ? <input type={type} step={field.type === 'integer' ? '1' : 'any'} required={field.required} value={value.text || ''} onChange={e => set({ text: e.target.value })}/> : <p role="status">This field requires the native v1 form editor.</p>
  }
  const formFields = record?.fields || []
  const unsupported = formFields.some(f => f.condition || !supportedFields.includes(f.type))
  const filteredRequests = assessmentRequests.filter(r => (!assessmentStatus || statusLabel(r.status) === assessmentStatus) && `${r.title} ${r.purpose}`.toLowerCase().includes(search.toLowerCase()))
  const editable = !!record && ['READY', 'OPEN', 'DRAFT'].includes(record.status) && record.recipient?.principal_id === context.actor.id
  async function downloadDocument(doc: Document) {
    await run(async () => {
      if (doc.artifact_status !== 'AVAILABLE' && !doc.demo_unscanned_allowed) throw Error(`Download is unavailable while the artifact is ${doc.artifact_status}.`)
      const params = new URLSearchParams({ download: 'true' }); if (doc.response_revision_id) params.set('response_revision_id', doc.response_revision_id)
      const response = await fetch(`/api/v1/forms/documents/${encodeURIComponent(doc.submission_id)}/${encodeURIComponent(doc.field_id)}/${encodeURIComponent(doc.artifact_id)}/content?${params}`, { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw Error(`Document content unavailable (${response.status}); backend scan and authority checks remain enforced.`)
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href = url; a.download = doc.file_name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }

  return <>
    {error && <p className="program-context-empty" role="alert">{error}</p>}
    {section === 'Assessment' ? <>
      <div className="program-register-tools"><label className="program-field">Search assessments<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, type or responsible team"/></label><label className="program-field">Status<select value={assessmentStatus} onChange={e => setAssessmentStatus(e.target.value)}><option value="">All statuses</option>{['Draft', 'Submitted', 'Changes requested', 'Reviewed'].map(s => <option key={s}>{s}</option>)}</select></label></div>
      <div className="program-assessment-workspace">
        <section className="surface program-cycle-browser"><div className="surface-heading"><h2>Assessment cycles</h2><span aria-live="polite">{filteredRequests.length} records</span></div>{filteredRequests.map(r => <button className="program-directory-entry program-register-record" key={r.id} aria-current={record?.id === r.id} onClick={() => { onSelect(r.id); setMode('questions') }}><span><strong>{r.title}</strong><small>{templates.find(t => t.id === r.form_template_id)?.name || r.purpose} · Due {new Date(r.deadline).toLocaleDateString(undefined,{timeZone:'UTC'})} · Updated {new Date(r.updated_at).toLocaleString()}</small></span><span className="pill">{statusLabel(r.status)}</span><span className="program-row-open">Open <span aria-hidden="true">→</span></span></button>)}{!filteredRequests.length && <p className="program-context-empty" role="status">{assessmentRequests.length ? 'No assessments match these filters.' : 'No requests returned for this Program. Create one from an approved form.'}</p>}</section>
        <section className="surface program-response-workspace"><div className="surface-heading"><div><h2>{record?.title || 'Select an assessment'}</h2><p>{record ? `${statusLabel(record.status)} · Version ${record.version}` : 'No selected record'}</p></div></div><div className="program-response-tabs" role="tablist" aria-label="Assessment detail" onKeyDown={detailTabs.onKeyDown}>{([['questions', 'Questions & responses'], ['config', 'Configuration'], ['history', 'Response history']] as const).map(([id, label], index) => <button key={id} ref={detailTabs.refAt(index)} role="tab" id={`connected-detail-${id}`} aria-controls={`connected-detail-panel-${id}`} aria-selected={mode === id} tabIndex={mode === id ? 0 : -1} onClick={() => setMode(id)}>{label}</button>)}</div><div className="program-detail-body" role="tabpanel" tabIndex={0} id={`connected-detail-panel-${mode}`} aria-labelledby={`connected-detail-${mode}`}>
          {mode === 'questions' ? <form onSubmit={e => { e.preventDefault(); if (!record) return; void run(async () => { const result = await command<Receipt>(scoped(`/api/v1/evidence/requests/${record.id}/submissions`, context), { expected_version: record.version, answers, channel: 'INTERNAL' }); setReceipt(result); onMessage(`Response stored: ${result.submission_id}. Submission is separate from independent review.`); await onRefresh() }) }}>
            <p className="program-response-caption">{submission ? `Latest submitted response · ${new Date(submission.submitted_at).toLocaleString()}` : record?.status === 'SUBMITTED' ? 'Response submitted; its answers are not available to this account.' : 'No response submitted. Draft answers are not reviewed outcomes.'}</p>
            {formFields.map((field, index) => <article className="v1-question" key={field.id}><small>Question {index + 1}{field.required ? ' · Required' : ''}</small><h3>{field.label}</h3><label className="program-field">{record?.status === 'SUBMITTED'?'Submitted answer':'Answer'}{input(field)}</label></article>)}
            {editable && <><div className="revision-actions"><button type="button" className="button" disabled title="Server draft saving is not available for this request">Save draft</button><button className="button primary" disabled={busy || unsupported}>Submit response</button></div><p className="program-response-caption">Answers remain on this screen until submitted. Server draft saving is unavailable for this request.</p></>}{submission && <p>Stored submission {submission.id} · {new Date(submission.submitted_at).toLocaleString()}</p>}{receipt && <p role="status">Receipt: {receipt.submission_id}</p>}
          </form> : mode === 'config' ? <>
            <h4>Response renewal policy</h4><p>Collection validity and renewal reminders are versioned settings. A saved change stays a draft until a separate reviewer approves it.</p>
            <label className="program-field">Form collection<select value={policyCheck} onChange={e => { const id = e.target.value; setPolicyCheck(id); const check = checks.find(c => c.id === id); setPolicyValues(check?.collection_policy || { validity_months: 12, renewal_window_days: 30, reminder_count: 3 }) }}><option value="">Choose a current form collection</option>{checks.filter(c => c.input_kind === 'FORM' && c.is_current && c.status === 'ACTIVE' && (!record?.form_template_id || c.form_template_id === record.form_template_id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            {policyOwner?.collection_policy && <p>Current schedule: every {policyOwner.collection_policy.validity_months} months · renewal opens {policyOwner.collection_policy.renewal_window_days} days before expiry · {policyOwner.collection_policy.reminder_count} reminders.</p>}
            {policyOwner && <form className="v1-question" onSubmit={savePolicy}><strong>Propose schedule change</strong><p>Changes do not take effect until independent approval.</p><label className="program-field">Collection frequency (months)<input type="number" min="1" max="120" value={policyValues.validity_months} onChange={e => setPolicyValues(v => ({ ...v, validity_months: Number(e.target.value) }))} required/></label><label className="program-field">Renewal window (days before expiry)<input type="number" min="1" max="90" value={policyValues.renewal_window_days} onChange={e => setPolicyValues(v => ({ ...v, renewal_window_days: Number(e.target.value) }))} required/></label><label className="program-field">Reminder count<input type="number" min="1" max="5" value={policyValues.reminder_count} onChange={e => setPolicyValues(v => ({ ...v, reminder_count: Number(e.target.value) }))} required/></label>{policyError && <p role="alert">{policyError}</p>}<button className="button" disabled={policyBusy}>Save schedule draft</button></form>}
            {policyDraft?.status === 'DRAFT' && canSubmitPolicy && <div className="v1-question"><strong>Independent schedule review</strong><p>Draft v{policyDraft.version}</p><button className="button" disabled={policyBusy} onClick={() => void transitionPolicy(policyDraft, 'PENDING_APPROVAL')}>Submit for review</button></div>}{policyDraft?.status === 'PENDING_APPROVAL' && canApprovePolicy && <div className="v1-question"><strong>Review schedule change</strong><p>v1 will check reviewer authority and separation from the proposer.</p><button className="button primary" disabled={policyBusy} onClick={() => void transitionPolicy(policyDraft, 'ACTIVE')}>Approve and activate</button></div>}{!policyOwner && <p>Schedule changes require the assigned collection owner and independent v1 approval.</p>}
          </> : <><h4>Response history</h4><V1FieldReview programId={programId}/>{submission ? <details open><summary>Submitted {new Date(submission.submitted_at).toLocaleString()}</summary><p>Submission ID: {submission.id}</p>{formFields.map(f => <div key={f.id}><strong>{f.label}</strong><p>{answers[f.id]?.text || answers[f.id]?.values?.join(', ') || 'Not answered'}</p></div>)}</details> : <p>No readable submission loaded for this request.</p>}</>}
        </div></section>
      </div>
    </> : <div>
      <section hidden={section !== 'Documents'} className="surface program-document-register"><div className="surface-heading"><div><h2>Document register</h2><p>Submission, review and compliance conclusions are separate.</p></div><span aria-live="polite">{visibleDocuments.length + visibleDocumentRequests.length} records</span></div>
        <div className="program-register-tools program-register-inset"><label className="program-field">Search documents<input type="search" placeholder="Name or linked assessment" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="program-field">Review status<select value={documentStatus} onChange={e => setDocumentStatus(e.target.value)}><option value="">All statuses</option><option>Submitted</option><option>Reviewed</option></select></label></div>
        <p>Submitted files remain separate from review decisions. Authorized downloads and linked response reviews are available where permitted.</p>
        {visibleDocuments.map(d => <button type="button" className="program-record-row program-register-record" key={`${d.submission_id}:${d.field_id}:${d.artifact_id}`} onClick={() => setSelectedDocument(d)}><span><strong>{d.file_name}</strong><small>{d.size_bytes} bytes · {d.artifact_status} · {requests.find(r=>r.id===d.request_id)?.title || 'Program document'}</small></span><span className="pill">{d.review ? 'Reviewed' : 'Submitted'}</span><span className="program-row-open">Inspect <span aria-hidden="true">→</span></span></button>)}
        {visibleDocumentRequests.map(r => <button className="program-directory-entry program-register-record" key={r.id} onClick={() => { onSelect(r.id); setMode('questions'); setDocumentRequestOpen(true) }}><span><strong>{r.title}</strong><small>{r.purpose} · {r.id.slice(-8)}</small></span><span className="pill">{statusLabel(r.status)}</span><span className="program-row-open">Open <span aria-hidden="true">→</span></span></button>)}
        {!visibleDocuments.length && !visibleDocumentRequests.length && <p className="program-context-empty" role="status">No documents match these filters.</p>}
        {documentReviewRevision && <div className="program-detail-body"><V1FieldReview key={documentReviewRevision} programId={programId} selectedRevisionId={documentReviewRevision}/></div>}
      </section>
      <section hidden={section !== 'Activity'} className="surface program-activity-register"><div className="surface-heading"><div><h2>Program event history</h2><p>Newest first · request snapshots only · timestamps shown in UTC.</p></div><span aria-live="polite">{activityRecords.length} records</span></div><div className="program-register-tools program-register-inset"><label className="program-field">Search history<input type="search" placeholder="Record, title or status" value={activitySearch} onChange={e => setActivitySearch(e.target.value)}/></label><label className="program-field">Event type<select value={activityType} onChange={e => setActivityType(e.target.value)}><option value="">All available events</option><option value="REQUEST_SNAPSHOT">Request snapshots</option></select></label></div><p className="program-context-empty" role="note">v1 request snapshots do not include a complete audit trail or verified actor details.</p><ol className="program-activity-timeline">{activityRecords.map(r => <li key={r.id}><div><strong>{r.title}</strong><span>{statusLabel(r.status)} · v{r.version}</span><small>{new Date(r.updated_at).toISOString().replace('T', ' ').slice(0, 16)} UTC · {r.id}</small></div></li>)}</ol>{!activityRecords.length && <p className="program-context-empty" role="status">No request snapshots match these filters.</p>}</section>
    </div>}
    {documentRequestOpen && record && documentRequests.some(r => r.id === record.id) && <RecordDialog title={record.title} onClose={() => setDocumentRequestOpen(false)}><p>{record.purpose}</p>{editable ? <form onSubmit={e => { e.preventDefault(); void run(async () => { const result = await command<Receipt>(scoped(`/api/v1/evidence/requests/${record.id}/submissions`, context), { expected_version: record.version, answers, channel: 'INTERNAL' }); setReceipt(result); setDocumentRequestOpen(false); onMessage(`Document submission recorded: ${result.submission_id}`); await onRefresh() }) }}>{record.fields.map(field => <label className="program-field v1-question" key={field.id}>{field.label}{input(field)}</label>)}<div className="program-dialog-actions"><button type="button" className="button" onClick={() => setDocumentRequestOpen(false)}>Cancel</button><button className="button primary" disabled={busy || unsupported || !Object.values(answers).some(answer => answer.artifact_ids?.length)}>Submit document</button></div>{error && <p role="alert">{error}</p>}</form> : <p>{submission ? `Submission ${submission.id} stored at ${new Date(submission.submitted_at).toLocaleString()}` : 'This request can be submitted by its assigned respondent.'}</p>}{artifacts.map(artifact => <p key={artifact.id}>{artifact.file_name} · {artifact.size_bytes} bytes · {artifact.status}</p>)}</RecordDialog>}
    {selectedDocument && <RecordDialog title={selectedDocument.file_name} onClose={() => setSelectedDocument(null)}><dl className="program-document-facts"><div><dt>Status</dt><dd>{selectedDocument.review?.status || 'Submitted · no review recorded'}</dd></div><div><dt>Assessment</dt><dd>{requests.find(r=>r.id===selectedDocument.request_id)?.title || 'Program document'}</dd></div><div><dt>File status</dt><dd>{selectedDocument.artifact_status}</dd></div><div><dt>Size</dt><dd>{selectedDocument.size_bytes} bytes</dd></div><div><dt>SHA-256</dt><dd>{selectedDocument.sha256}</dd></div></dl><p>Download the original file to inspect its contents.</p><div className="program-dialog-actions"><button type="button" className="button primary" disabled={selectedDocument.artifact_status !== 'AVAILABLE' && !selectedDocument.demo_unscanned_allowed} title="Download the authorized document" onClick={() => void downloadDocument(selectedDocument)}>Download document</button>{selectedDocument.response_revision_id && <button type="button" className="button" onClick={() => { setDocumentReviewRevision(selectedDocument.response_revision_id!); setSelectedDocument(null) }}>Review linked response</button>}</div></RecordDialog>}
    {documentDialog && <RecordDialog title="Add supporting document" onClose={() => setDocumentDialog(false)}><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(async () => { const created = await command<RequestRecord>(scoped('/api/v1/evidence/requests', context), { tenant_id: context.tenant.id, legal_entity_id: context.legal_entity.id, subject_type: 'PROGRAM', subject_id: programId, title: data.get('title'), purpose: 'Supporting documentation for the selected Program', why_you: 'You are submitting supporting Program evidence.', sensitivity: 'INTERNAL', audience_type: 'INTERNAL', recipient: { type: 'INTERNAL_PRINCIPAL', principal_id: context.actor.id }, estimated_minutes: 5, deadline: `${data.get('due')}T23:59:59Z`, known_facts: {}, fields: [{ id: 'supporting_document', label: 'Supporting document', type: 'file', required: true }], presentation: { default_mode: 'AUTOMATIC', allow_mode_switch: false } }); onSelect(created.id); setDocumentDialog(false); await onRefresh(); setDocumentRequestOpen(true); onMessage('Document request created. Select a file and submit it to complete collection.') }) }}><label className="program-field">Document title<input name="title" required maxLength={200}/></label><label className="program-field">Due date<input name="due" type="date" required/></label><p role="alert">{error}</p><button className="button primary" disabled={busy}>Create document request</button></form></RecordDialog>}
  </>
}
