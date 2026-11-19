
import { AddAssessmentDocument } from './AddAssessmentDocument'
import { DocumentInspection } from './DocumentInspection'
import type { ProgramDocument } from './DocumentInspection'
import { documentResponseHref, loadDocumentPages } from './documentRegisterModel'
import { ProgramAssessments } from './ProgramAssessments'
import { AssessmentAnswerQuality } from './AssessmentAnswerQuality'
import { useEffect, useState } from 'react'
import { command, scoped, v1 } from './v1Client'
import type { AssessmentActivity, Answer, Artifact, Field, Receipt, RequestRecord, Template, V1Context } from './v1Client'
import { V1FieldReview } from './V1FieldReview'
import { RecordDialog } from './RecordDialog'
import type { AssessmentReviewReceipt } from './assessmentResponseModel'
import { assessmentReviewFor } from './assessmentResponseModel'
import { assessmentStatusLabel, documentStatusLabel, reviewStatusTone, statusLabel } from './reviewStatus'

type Props = { loading: boolean; openSchedules?: boolean; initialDocumentQueue?: boolean; context: V1Context; programId: string; requests: RequestRecord[]; activities: AssessmentActivity[]; activitiesLimited: boolean; onOpenAssessment: (id: string) => void; templates: Template[]; selected: string; onSelect: (id: string) => void; section: 'Assessment' | 'Documents' | 'Activity'; activityExportRef: { current: (() => void) | null }; openDocument?: boolean; onDocumentHandled?: () => void; onRefresh: () => Promise<void>; onMessage: (message: string) => void }
type Document = ProgramDocument

const supportedFields = ['short_text', 'long_text', 'text', 'attestation', 'checkbox', 'multi_select', 'single_select', 'yes_no', 'file', 'photo', 'signature', 'integer', 'decimal', 'number', 'percentage', 'currency', 'email', 'url', 'date']

export function V1Responses(props: Props) {
  const { context, programId, requests, section } = props
  const [reviews, setReviews] = useState<AssessmentReviewReceipt[]>([])
  const [reviewError, setReviewError] = useState('')
  useEffect(() => {
    let active = true
    void v1<{ items: AssessmentReviewReceipt[] }>(scoped(`/api/v1/programs/${programId}/assessment-reviews`, context))
      .then(result => { if (active) { setReviews(result.items); setReviewError('') } })
      .catch(() => { if (active) { setReviews([]); setReviewError('Assessment review status could not be loaded.') } })
    return () => { active = false }
  }, [programId, context, requests])
  return <>
    {reviewError && <p role="alert" className="program-context-empty">{reviewError}</p>}
    {section === 'Assessment' ? <ProgramAssessments context={context} programId={programId} requests={requests} reviews={reviews}
      templates={props.templates} selected={props.selected} loading={props.loading} openSchedules={props.openSchedules}
      onSelect={props.onSelect} onChanged={props.onRefresh} onMessage={props.onMessage}/> :
      <ResponseRegisters {...props} reviews={reviews}/>}
  </>
}

function ResponseRegisters({ initialDocumentQueue, context, programId, requests, selected, activities, activitiesLimited, onOpenAssessment, section, activityExportRef, onRefresh, onMessage, openDocument, onDocumentHandled, reviews }: Props & { reviews: AssessmentReviewReceipt[] }) {
  const [documentRequestId, setDocumentRequestId] = useState('')
  const record = requests.find(item => item.id === documentRequestId)
  const [search, setSearch] = useState('')
  const [documentStatus, setDocumentStatus] = useState(initialDocumentQueue ? 'Needs review' : '')
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [evidenceView, setEvidenceView] = useState('current')
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [documentRetry, setDocumentRetry] = useState(0)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [documentReviewRevision, setDocumentReviewRevision] = useState('')
  const [documentDestination, setDocumentDestination] = useState('assessment')
  const [documentDialog, setDocumentDialog] = useState(false)
  const [documentRequestOpen, setDocumentRequestOpen] = useState(false)
  useEffect(() => { if (section === 'Documents' && selected && new URLSearchParams(window.location.search).get('request') === selected && requests.some(item => item.id === selected && item.purpose === 'Supporting documentation for the selected Program')) { setDocumentRequestId(selected); setDocumentRequestOpen(true) } }, [selected, section, requests])
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (openDocument) { setDocumentDialog(true); onDocumentHandled?.() } }, [openDocument, onDocumentHandled])
  useEffect(() => {
    let active = true
    setAnswers({}); setArtifacts([]); setError(''); setDraftLoading(false); setDraftReady(false)
    if (record && ['READY', 'IN_PROGRESS', 'OPEN', 'DRAFT'].includes(record.status) && record.recipient?.principal_id === context.actor.id) {
      setDraftLoading(true)
      void v1<{answers: Record<string, Answer>; version: number}>(scoped(`/api/v1/evidence/requests/${record.id}/draft`, context)).then(draft => {
        if (active) { setAnswers(draft.answers || {}); setDraftReady(true) }
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'The saved draft could not be loaded.') }).finally(() => { if (active) setDraftLoading(false) })
    }
    return () => { active = false }
  }, [record?.id, record?.version, context, section])
  const documentState = (doc: Document) => documentStatusLabel(doc, reviews)
  const assessmentState = (request: RequestRecord) => assessmentStatusLabel(request.status, assessmentReviewFor(request, reviews), request.latest_assessment_revision)
  useEffect(() => {
    let active = true
    if (section !== 'Documents') return
    setDocumentLoading(true)
    setDocumentError('')
    setDocuments([])
    setSelectedDocument(null)
    void loadDocumentPages<Document>(programId, evidenceView === 'current',
      path => v1<{ items: Document[]; next_cursor?: string }>(path), () => active,
    ).then(items => { if (active) setDocuments(items) })
      .catch(e => { if (active) setDocumentError(e instanceof Error ? e.message : 'Documents could not be loaded.') })
      .finally(() => { if (active) setDocumentLoading(false) })
    return () => { active = false }
  }, [programId, evidenceView, requests, context.actor.id, documentRetry, section])
  const visibleDocuments = documents.filter(d => {
    const request = requests.find(r => r.id === d.request_id)
    const reviewState = documentState(d)
    return `${d.file_name} ${d.form_title} ${d.field_label} ${request?.title || ''}`.toLowerCase().includes(search.toLowerCase()) && (!documentStatus || (documentStatus === 'Needs review' ? reviewState !== 'Reviewed' : documentStatus === reviewState))
  })
  const documentRequests = requests.filter(r => r.fields.some(f => ['file', 'photo', 'vendor_document'].includes(f.type)))
  const visibleDocumentRequests = documentStatus || evidenceView !== 'current' || documentLoading || documentError ? [] : documentRequests.filter(r => !documents.some(d => d.request_id === r.id) && `${r.title} ${r.purpose}`.toLowerCase().includes(search.toLowerCase()))

  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') } finally { setBusy(false) } }
  async function upload(field: Field, file?: File) {
    if (!record || !file) return
    await run(async () => { const data = new FormData(); data.set('request_id', record.id); data.set('field_id', field.id); data.set('file', file); const artifact = await v1<Artifact>('/api/v1/evidence/artifacts', { method: 'POST', body: data }); setArtifacts(prev => [...prev, artifact]); setAnswers(prev => ({ ...prev, [field.id]: { artifact_ids: [artifact.id] } })); onMessage(`File uploaded to v1. Scan status: ${artifact.status}. Submit the response to bind it as evidence.`) })
  }
  function input(field: Field) {
    const value = answers[field.id] || {}
    const set = (answer: Answer) => setAnswers(previous => ({ ...previous, [field.id]: answer }))
    if (!record || !['READY', 'IN_PROGRESS', 'OPEN', 'DRAFT'].includes(record.status) || record.recipient?.principal_id !== context.actor.id) return <p>The assigned respondent can complete this request.</p>
    if (field.condition) return <p role="status">This field has conditional rules. Complete it in the v1 governed form workspace.</p>
    if (['file', 'photo', 'signature'].includes(field.type)) return <><input type="file" aria-label={field.label} disabled={busy || draftLoading || !draftReady} onChange={e => void upload(field, e.target.files?.[0])}/><small>{value.artifact_ids?.length ? 'File uploaded. Submit the document to finish.' : 'Choose a file to attach.'}</small></>
    if (field.type === 'attestation' || field.type === 'checkbox') return <label><input type="checkbox" checked={value.text === 'true'} required={field.required} onChange={e => set({ text: e.target.checked ? 'true' : 'false' })}/>{field.attestation || field.label}</label>
    if (field.type === 'multi_select') return <select multiple required={field.required} value={value.values || []} onChange={e => set({ values: Array.from(e.target.selectedOptions).map(o => o.value) })}>{field.options?.map(o => <option key={o}>{o}</option>)}</select>
    if (field.options?.length) return <select required={field.required} value={value.text || ''} onChange={e => set({ text: e.target.value })}><option value="">Choose an answer</option>{field.options.map(o => <option key={o}>{o}</option>)}</select>
    if (['short_text', 'long_text', 'text'].includes(field.type)) return <textarea required={field.required} value={value.text || ''} onChange={e => set({ text: e.target.value })} rows={3}/>
    const type = ['integer', 'decimal', 'number', 'percentage', 'currency'].includes(field.type) ? 'number' : ['email', 'url', 'date'].includes(field.type) ? field.type : ''
    return type ? <input type={type} step={field.type === 'integer' ? '1' : 'any'} required={field.required} value={value.text || ''} onInput={e => set({ text: e.currentTarget.value })} onChange={e => set({ text: e.target.value })}/> : <p role="status">This field requires the native v1 form editor.</p>
  }
  const formFields = record?.fields || []
  const unsupported = formFields.some(f => f.condition || !supportedFields.includes(f.type))
  const editable = !!record && ['READY', 'IN_PROGRESS', 'OPEN', 'DRAFT'].includes(record.status) && record.recipient?.principal_id === context.actor.id
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
    <div>
      <section hidden={section !== 'Documents'} className="surface program-document-register"><div className="surface-heading"><div><h2>Document register</h2><p>Open a file to see its review status and download options.</p></div><span aria-live="polite">{visibleDocuments.length + visibleDocumentRequests.length} records</span></div>
        <div className="program-register-tools program-register-inset"><label className="program-field">Evidence versions<select value={evidenceView} onChange={e => setEvidenceView(e.target.value)}><option value="current">Current evidence</option><option value="all">Current and previous evidence</option></select></label><label className="program-field">Search documents<input type="search" placeholder="Name or linked assessment" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="program-field">Review status<select value={documentStatus} onChange={e => setDocumentStatus(e.target.value)}><option value="">All statuses</option><option>Needs review</option><option>Submitted</option><option>Reviewed</option><option>Follow-up required</option></select></label></div>
        {documentError && <p className="program-context-empty" role="alert">{documentError} <button type="button" className="text-link" onClick={() => setDocumentRetry(value => value + 1)}>Try again</button></p>}{documentLoading && <p className="program-context-empty" role="status">Loading all authorized Program documents…</p>}{visibleDocuments.map(d => <button type="button" className="program-record-row program-register-record" key={`${d.submission_id}:${d.field_id}:${d.artifact_id}`} onClick={() => setSelectedDocument(d)}><span><strong>{d.file_name}</strong><small>{d.current ? 'Current' : 'Previous evidence'} · {d.field_label} · {d.size_bytes} bytes · {d.artifact_status} · {d.form_title || requests.find(r=>r.id===d.request_id)?.title || 'Program document'}</small></span><AssessmentAnswerQuality field={{id:d.field_id,label:d.file_name,type:"file",required:false}} provenance={{expires_at:d.answer_expires_at}}/><span className={`pill ${reviewStatusTone[documentState(d)] || ''}`}>{documentState(d)}</span><span className="program-row-open">Inspect <span aria-hidden="true">→</span></span></button>)}
        {visibleDocumentRequests.map(r => <button className="program-directory-entry program-register-record" key={r.id} onClick={() => { setDocumentRequestId(r.id); setDocumentRequestOpen(true) }}><span><strong>{r.title}</strong><small>{r.purpose} · {r.id.slice(-8)}</small></span><span className="pill">{assessmentState(r)}</span><span className="program-row-open">Open <span aria-hidden="true">→</span></span></button>)}
        {!documentError && !documentLoading && !visibleDocuments.length && !visibleDocumentRequests.length && <p className="program-context-empty" role="status">No documents match these filters.</p>}
        {documentReviewRevision && <div className="program-detail-body"><V1FieldReview key={documentReviewRevision} programId={programId} selectedRevisionId={documentReviewRevision}/></div>}
      </section>


    </div>
    {documentRequestOpen && record && documentRequests.some(r => r.id === record.id) && <RecordDialog title={record.title} onClose={() => setDocumentRequestOpen(false)}><p>{record.purpose}</p>{editable ? <form onSubmit={e => { e.preventDefault(); void run(async () => { const result = await command<Receipt>(scoped(`/api/v1/evidence/requests/${record.id}/submissions`, context), { expected_version: record.version, answers, channel: 'INTERNAL' }); setDocumentRequestOpen(false); onMessage(`Document submission recorded: ${result.submission_id}`); await onRefresh() }) }}>{record.fields.map(field => <label className="program-field v1-question" key={field.id}>{field.label}{input(field)}</label>)}<div className="program-dialog-actions"><button type="button" className="button" onClick={() => setDocumentRequestOpen(false)}>Cancel</button><button className="button primary" disabled={busy || unsupported || !Object.values(answers).some(answer => answer.artifact_ids?.length)}>Submit document</button></div>{error && <p role="alert">{error}</p>}</form> : <p>{'This request can be submitted by its assigned respondent.'}</p>}{artifacts.map(artifact => <p key={artifact.id}>{artifact.file_name} · {artifact.size_bytes} bytes · {artifact.status}</p>)}</RecordDialog>}
    {selectedDocument && <RecordDialog title={selectedDocument.file_name} onClose={() => setSelectedDocument(null)}><dl className="program-document-facts"><div><dt>Review status</dt><dd><span className={`pill ${reviewStatusTone[documentState(selectedDocument)] || ''}`}>{documentState(selectedDocument)}</span></dd></div><div><dt>Assessment</dt><dd>{selectedDocument.form_title || requests.find(r=>r.id===selectedDocument.request_id)?.title || 'Program document'}</dd></div><div><dt>Evidence version</dt><dd>{selectedDocument.current ? "Current" : "Previous evidence"}</dd></div><div><dt>Question</dt><dd>{selectedDocument.field_label}</dd></div><div><dt>Submitted</dt><dd>{new Date(selectedDocument.submitted_at).toLocaleString()}</dd></div><div><dt>Answer validity</dt><dd>{selectedDocument.answer_expires_at ? <AssessmentAnswerQuality field={{id:selectedDocument.field_id,label:selectedDocument.file_name,type:"file",required:false}} provenance={{expires_at:selectedDocument.answer_expires_at}}/> : "No expiry configured"}</dd></div><div><dt>File status</dt><dd>{selectedDocument.artifact_status}</dd></div><div><dt>Size</dt><dd>{selectedDocument.size_bytes} bytes</dd></div><div><dt>SHA-256</dt><dd>{selectedDocument.sha256}</dd></div></dl><DocumentInspection document={selectedDocument} context={context} programId={programId}/><div className="program-dialog-actions"><button type="button" className="button primary" disabled={selectedDocument.artifact_status !== 'AVAILABLE' && !selectedDocument.demo_unscanned_allowed} title="Download the authorized document" onClick={() => void downloadDocument(selectedDocument)}>Download document</button>{!selectedDocument.response_revision_id && <button type="button" className="button" onClick={() => { window.location.assign(documentResponseHref(window.location.href, selectedDocument)) }}>Review linked assessment</button>}{selectedDocument.response_revision_id && <button type="button" className="button" onClick={() => { setDocumentReviewRevision(selectedDocument.response_revision_id!); setSelectedDocument(null) }}>Review linked response</button>}</div></RecordDialog>}
    {documentDialog && <RecordDialog title="Add supporting document" onClose={() => setDocumentDialog(false)}><label className="program-field">Attach document to<select value={documentDestination} onChange={e=>setDocumentDestination(e.target.value)}><option value="assessment">Existing assessment</option><option value="program">Standalone Program document</option></select></label>{documentDestination === "assessment" ? <AddAssessmentDocument context={context} programId={programId} requests={requests} onSaved={async request=>{setDocumentDialog(false);onMessage("Evidence saved to the assessment draft. Complete and submit the response for review.");await onRefresh();const url=new URL(window.location.href);url.searchParams.set('tab','assessment');url.searchParams.set('request',request.id);url.searchParams.delete('submission');url.searchParams.delete('field');window.location.assign(url.href)}}/> : <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(async () => { const created = await command<RequestRecord>(scoped('/api/v1/evidence/requests', context), { tenant_id: context.tenant.id, legal_entity_id: context.legal_entity.id, subject_type: 'PROGRAM', subject_id: programId, title: data.get('title'), purpose: 'Supporting documentation for the selected Program', why_you: 'You are submitting supporting Program evidence.', sensitivity: 'INTERNAL', audience_type: 'INTERNAL', recipient: { type: 'INTERNAL_PRINCIPAL', principal_id: context.actor.id }, estimated_minutes: 5, deadline: `${data.get('due')}T23:59:59Z`, known_facts: {}, fields: [{ id: 'supporting_document', label: 'Supporting document', type: 'file', required: true }], presentation: { default_mode: 'AUTOMATIC', allow_mode_switch: false } }); setDocumentRequestId(created.id); setDocumentDialog(false); await onRefresh(); setDocumentRequestOpen(true); onMessage('Document request created. Select a file and submit it to complete collection.') }) }}><label className="program-field">Document title<input name="title" required maxLength={200}/></label><label className="program-field">Due date<input name="due" type="date" required/></label><p role="alert">{error}</p><button className="button primary" disabled={busy}>Create document request</button></form>}</RecordDialog>}
  </>
}
