import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ResponseInput, responseFieldTypes } from '../assessments/AssignedAssessment'
import { AssessmentAnswerQuality } from './AssessmentAnswerQuality'
import { AssessmentRequirementContext } from './AssessmentRequirementContext'
import { AssessmentEvidence, useAssessmentFiles } from './AssessmentEvidence'
import type { AssessmentFile } from './AssessmentEvidence'
import { AssessmentReview, SubmittedValue } from './AssessmentReview'
import { AssessmentQuestionFeedback } from './AssessmentResponseHistory'
import { answerPresent, attachmentIds, isAssessmentDraft, updateAssessmentAnswer, visibleAssessmentFields } from './assessmentResponseModel'
import type { AssessmentDraft, AssessmentHistory, AssessmentReviewReceipt, CorrectionWindow, DraftAttachment } from './assessmentResponseModel'
import { command, scoped, v1 } from './v1Client'
import type { Answer, Artifact, Field, Receipt, RequestRecord, Submission, V1Context } from './v1Client'

const fileTypes = ['file', 'photo', 'signature', 'vendor_document']

type Props = {
  context: V1Context
  programId: string
  record: RequestRecord
  history?: AssessmentHistory
  revision?: AssessmentHistory
  currentReview?: AssessmentReviewReceipt
  onChanged: () => Promise<void>
  onHistory: () => void
}

export function ProgramAssessmentResponse({ context, programId, record, history, revision, currentReview, onChanged, onHistory }: Props) {
  const [editing, setEditing] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [receipt, setReceipt] = useState<Receipt>()
  const latest = history?.revisions[0]
  const submission = revision?.submission
  const respondent = record.recipient?.principal_id === context.actor.id
  const initialDraft = respondent && isAssessmentDraft(record) && !receipt
  const correction = history?.correction
  const correctionActive = !!correction && correction.submission_id === latest?.id && correction.submission_id === record.latest_assessment_submission_id
  const canReview = !!history?.can_review && !!revision?.can_review && !!submission?.answers && submission.id === latest?.id && currentReview?.status !== 'REVIEWED'
  const files = useAssessmentFiles(latest?.can_read ? latest.id : undefined)
  const visible = submission?.answers ? visibleAssessmentFields(record, submission.answers) : []
  const correctionDue = currentReview?.correction_due_at || record.deadline

  return <>
    {receipt && <div className="assessment-callout" role="status">
      <strong>Response revision {receipt.revision || 1} {receipt.revision && receipt.revision > 1 ? 'resubmitted' : 'submitted'}</strong>
      <span>Awaiting independent review.</span>
      <button type="button" className="text-link" onClick={onHistory}>View response history</button>
    </div>}
    {currentReview?.status === 'FOLLOW_UP_REQUIRED' && <section className="assessment-callout needs-change" aria-label="Changes requested">
      <strong>Changes requested for response revision {latest?.revision || record.latest_assessment_revision || 1}</strong>
      <p>{currentReview.rationale}</p>
      <span>Correction due <time dateTime={correctionDue}>{new Date(correctionDue).toLocaleString()}</time></span>
      {respondent && correctionActive && !editing && <button className="button primary sm" type="button" onClick={() => { setReceipt(undefined); setEditing(true) }}>Edit response</button>}
      {respondent && history && !correctionActive && <small>The correction window is closed. The reviewer can issue a new deadline.</small>}
    </section>}
    {currentReview?.status === 'REVIEWED' && <div className="assessment-callout">
      <strong>Evidence reviewed</strong><p>{currentReview.rationale}</p>
      <button type="button" className="text-link" onClick={onHistory}>View review decisions</button>
    </div>}
    {canReview && <div className="assessment-response-toolbar">
      <span>Response revision {submission.revision || 1}</span>
      <button type="button" className="button primary sm" aria-haspopup="dialog" onClick={() => setReviewOpen(true)}>
        {currentReview?.status === 'FOLLOW_UP_REQUIRED' ? 'Update correction request' : 'Review response'}
      </button>
    </div>}
    {initialDraft || (editing && correctionActive) ? <ResponseEditor
      key={correction?.review_id || record.id}
      context={context} record={record} correction={initialDraft ? undefined : correction}
      original={submission} currentReview={currentReview} files={files?.files}
      onCancel={initialDraft ? undefined : () => setEditing(false)}
      onSubmitted={async result => { setReceipt(result); setEditing(false); await onChanged() }}/> : <>
      {latest ? <p className="program-response-caption">Latest submitted response · Revision {latest.revision} · <time dateTime={latest.submitted_at}>{new Date(latest.submitted_at).toLocaleString()}</time></p>
        : <p className="program-response-caption">{record.status === 'SUBMITTED' ? 'Loading the submitted response…' : 'The assigned respondent can submit answers for this cycle.'}</p>}
      {latest && !latest.can_read && <p>Submitted answers are visible to the assigned respondent and reviewer.</p>}
      {submission?.answers && latest?.can_read && <AssessmentRequirementContext context={context} record={record} renderQuestion={(field, index) => {
        if (!visible.includes(field)) return null
        const answer = submission.answers[field.id]
        return <article className="assessment-question">
          <small>Question {index + 1}{field.required && ' · Required'}</small><h3>{field.label}</h3>
          <div className="assessment-submitted"><small>Submitted answer</small>
            {fileTypes.includes(field.type) && answerPresent(answer) ?
              <AssessmentEvidence field={field} answer={answer} submissionId={submission.id} files={files?.files} fileDetailsUnavailable={files?.unavailable}/> :
              <SubmittedValue answer={answer}/>}
          </div>
          <AssessmentAnswerQuality field={field} provenance={submission.answer_provenance?.[field.id]}/>
          <AssessmentQuestionFeedback field={field} review={currentReview}/>
        </article>
      }}/>}
    </>}
    {reviewOpen && canReview && <AssessmentReview context={context} programId={programId} record={record} submission={submission}
      expectedVersion={history.latest_review_version} files={files?.files} onClose={() => setReviewOpen(false)}
      onRecorded={async () => { setReviewOpen(false); await onChanged() }}/>}
  </>
}

function ResponseEditor({ context, record, correction, original, currentReview, files, onCancel, onSubmitted }: {
  context: V1Context
  record: RequestRecord
  correction?: CorrectionWindow
  original?: Submission
  currentReview?: AssessmentReviewReceipt
  files?: AssessmentFile[]
  onCancel?: () => void
  onSubmitted: (receipt: Receipt) => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [uploads, setUploads] = useState<DraftAttachment[]>([])
  const [draftVersion, setDraftVersion] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const path = `/api/v1/evidence/requests/${record.id}`
  const proof = correction ? { submission_id: correction.submission_id, review_id: correction.review_id } : undefined
  const query = proof ? '?' + new URLSearchParams(proof) : ''
  const draftURL = scoped(path + '/draft' + query, context)
  const visible = visibleAssessmentFields(record, answers)
  const unsupported = visible.some(field => !responseFieldTypes.includes(field.type) && !fileTypes.includes(field.type))

  useEffect(() => {
    let active = true
    setError('')
    void v1<AssessmentDraft>(draftURL).then(data => {
      if (active) { setAnswers(data.answers || {}); setUploads(data.attachments || []); setDraftVersion(data.version); setLoaded(true) }
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'The draft could not be loaded.')
    })
    return () => { active = false }
  }, [draftURL, retry])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(fieldId: string, value: Answer) {
    setAnswers(current => updateAssessmentAnswer(record, current, fieldId, value))
    setDirty(true)
  }

  async function run(task: () => Promise<void>) {
    if (busy || !loaded) return
    setBusy(true)
    setError('')
    try { await task() } catch (e) {
      setError(e instanceof Error ? e.message : 'The response could not be saved.')
    } finally { setBusy(false) }
  }
  async function upload(field: Field, file?: File) {
    if (!file) return
    await run(async () => {
      const data = new FormData()
      data.set('request_id', record.id)
      data.set('field_id', field.id)
      data.set('file', file)
      if (proof) {
        data.set('correction_submission_id', proof.submission_id)
        data.set('correction_review_id', proof.review_id)
      }
      const artifact = await v1<Artifact>('/api/v1/evidence/artifacts', { method: 'POST', body: data })
      setUploads(current => [...current, artifact])
      const document = answers[field.id]?.document
      update(field.id, field.type === 'vendor_document' ? { document: { ...document, artifact_id: artifact.id } } : { artifact_ids: [artifact.id] })
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missing = visible.find(field => field.required && !answerPresent(answers[field.id]))
    if (missing) { setError(`Complete ${missing.label} before submitting.`); return }
    await run(async () => {
      const result = await command<Receipt>(scoped(path + '/submissions', context), { expected_version: record.version, correction: proof, answers, channel: 'INTERNAL' })
      setDirty(false)
      await onSubmitted(result)
    })
  }

  if (!loaded) return error ? <p role="alert">{error} <button type="button" className="text-link" onClick={() => setRetry(value => value + 1)}>Try again</button></p> : <p role="status">Loading saved answers…</p>
  return <form className="assessment-editor" name="assessment-response" onSubmit={event => void submit(event)}>
    <p className="program-response-caption">{correction ? `Correcting response revision ${original?.revision || record.latest_assessment_revision || 1}` : 'Complete the assessment and submit it for independent review.'}</p>
    <fieldset disabled={busy}>
      <legend className="sr-only">Assessment questions</legend>
      <AssessmentRequirementContext record={record} context={context} renderQuestion={(field, index) => {
        if (!visible.includes(field)) return null
        const answer = answers[field.id] || {}
        const originalAnswer = original?.answers?.[field.id]
        const attached = attachmentIds(field, answer).length > 0
        return <article className="assessment-question" aria-label={field.label}>
          <small>Question {index + 1}{field.required && ' · Required'}</small><h3>{field.label}</h3>
          {field.description && <p>{field.description}</p>}
          {field.image && <img className="simple-preview-image" src={field.image.data} alt={field.image.alt}/>}
          <AssessmentQuestionFeedback field={field} review={currentReview}/>
          {fileTypes.includes(field.type) ? <>
            <label className="assessment-response-label">{attached ? 'Replace supporting file' : 'Add supporting file'}
              <input aria-label={field.label} type="file" accept={field.accepted_formats?.join(',')} onChange={event => void upload(field, event.target.files?.[0])}/></label>
            <AssessmentEvidence field={field} answer={answer} originalAnswer={originalAnswer} submissionId={original?.id} files={files} uploads={uploads}/>
            {!field.required && attached && <button type="button" className="text-link" onClick={() => update(field.id, {})}>Remove attachment</button>}
            {field.type === 'vendor_document' && attached && <label className="assessment-response-label">Document type
              <input required value={answer.document?.document_type || ''} onChange={event => update(field.id, { document: { ...answer.document, document_type: event.target.value } })}/></label>}
          </> : <ResponseInput field={field} answer={answer} disabled={busy} onChange={value => update(field.id, value)}/>}
          <AssessmentAnswerQuality field={field}/>
        </article>
      }}/>
    </fieldset>
    {unsupported && <p role="status">This assessment uses a response type that requires the governed form workspace.</p>}
    {error && <p className="assessment-error" role="alert">{error}</p>}
    <div className="revision-actions">
      {onCancel && <button type="button" className="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) onCancel() }}>Cancel editing</button>}
      <button type="button" className="button" disabled={busy || unsupported} onClick={() => void run(async () => {
        const draft = await command<AssessmentDraft>(scoped(path + '/draft', context), { expected_version: draftVersion, correction: proof, answers, presentation_mode: 'AUTOMATIC' })
        setDraftVersion(draft.version)
        setDirty(false)
      })}>Save draft</button>
      <button className="button primary" type="submit" disabled={busy || unsupported || !visible.length}>{busy ? 'Saving…' : correction ? 'Resubmit response' : 'Submit response'}</button>
    </div>
    <p className="program-response-caption" role="status">{dirty ? 'Unsaved changes' : draftVersion ? 'Draft saved' : ''}</p>
  </form>
}
