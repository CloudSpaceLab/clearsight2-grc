import { useEffect, useRef, useState } from 'react'
import type { Field, RequestRecord, V1Context } from './v1Client'
import { v1 } from './v1Client'
import type { AssessmentHistory, AssessmentReviewReceipt, AssessmentRevisionSummary } from './assessmentResponseModel'
import { reviewGroupId, visibleAssessmentFields } from './assessmentResponseModel'
import { AssessmentAnswerQuality } from './AssessmentAnswerQuality'
import { AssessmentEvidence, useAssessmentFiles } from './AssessmentEvidence'
import { SubmittedValue } from './AssessmentReview'
import { assessmentStatusLabel, reviewStatusTone } from './reviewStatus'

export function AssessmentReviewNotes({ review, record }: { review: AssessmentReviewReceipt; record: RequestRecord }) {
  return <section className="assessment-review-notes" aria-label={`Decision ${review.version}`}>
    <header><strong>{review.status === 'FOLLOW_UP_REQUIRED' ? 'Changes requested' : 'Evidence reviewed'}</strong>
      <small>Review {review.version} · <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleString()}</time></small></header>
    <p>{review.rationale}</p>
    {review.correction_due_at && <small>Correction due <time dateTime={review.correction_due_at}>{new Date(review.correction_due_at).toLocaleString()}</time></small>}
    <ul>{review.groups.map(group => <li key={group.group_id}>
      <strong>{record.sections?.find(section => section.id === group.group_id)?.title || 'Question group'}</strong>
      <span className={`pill ${group.outcome === 'REVIEWED' ? 'received' : 'incomplete'}`}>{group.outcome === 'REVIEWED' ? 'Reviewed' : 'Changes needed'}</span>
      {!group.questions?.length && group.rationale !== review.rationale && <p>{group.rationale}</p>}
      {!!group.questions?.length && <ul>{group.questions.map(question => <li key={question.field_id}>
        <span>{record.fields.find(field => field.id === question.field_id)?.label || question.field_id}</span>
        <small>{question.outcome === 'REVIEWED' ? 'Reviewed' : 'Changes needed'}{question.rationale && ` · ${question.rationale}`}</small>
      </li>)}</ul>}
    </li>)}</ul>
  </section>
}

export function AssessmentResponseHistory({ path, page, record, context }: {
  path: string
  page: AssessmentHistory
  record: RequestRecord
  context: V1Context
}) {
  const linkedSubmission = new URLSearchParams(window.location.search).get('submission')
  const [linked, setLinked] = useState<AssessmentRevisionSummary>()
  useEffect(() => {
    if (!linkedSubmission || page.revisions.some(item => item.id === linkedSubmission)) return
    let active = true
    void v1<AssessmentHistory>(path + '&submission_id=' + encodeURIComponent(linkedSubmission)).then(value => {
      const sub = value.submission
      if (active && sub) setLinked({ id: sub.id, revision: sub.revision || 1, submitted_at: sub.submitted_at, can_read: !!sub.answers, review_status: value.reviews?.[0]?.status })
    }).catch(e => { if (active) setError(String(e)) })
    return () => { active = false }
  }, [path, linkedSubmission, page])
  const [extra, setExtra] = useState<AssessmentRevisionSummary[]>([])
  const [cursor, setCursor] = useState(page.next_before_revision)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function loadOlder() {
    setBusy(true)
    setError('')
    try {
      const older = await v1<AssessmentHistory>(path + '&before_revision=' + cursor)
      setExtra(current => [...current, ...older.revisions])
      setCursor(older.next_before_revision)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Earlier responses could not be loaded.')
    } finally {
      setBusy(false)
    }
  }
  if (!page.revisions.length) return <p role="status">Submitted responses will appear here.</p>
  return <div className="assessment-history">
    <p>Open a revision to see the submitted answers, evidence, and review decisions recorded for it.</p>
    {[...(linked ? [linked] : []), ...page.revisions, ...extra].filter((item,index,items)=>items.findIndex(other=>other.id===item.id)===index).map(item => <Revision key={item.id} item={item} path={path} record={record} context={context}/>)}
    {error && <p role="alert">{error}</p>}
    {cursor && <button type="button" className="button" disabled={busy} onClick={() => void loadOlder()}>{busy ? 'Loading…' : 'Load earlier revisions'}</button>}
  </div>
}

function Revision({ item, path, record, context }: {
  item: AssessmentRevisionSummary
  path: string
  record: RequestRecord
  context: V1Context
}) {
  const [opened, setOpened] = useState(new URLSearchParams(window.location.search).get('submission') === item.id)
  const [revision, setRevision] = useState<AssessmentHistory>()
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const files = useAssessmentFiles(item.can_read && opened ? item.id : undefined)
  const focusedQuestion = useRef(false)
  const exact = path + '&submission_id=' + encodeURIComponent(item.id)
  useEffect(() => {
    if (!opened || revision) return
    let active = true
    setError('')
    void v1<AssessmentHistory>(exact).then(value => {
      if (active) setRevision(value)
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'This response could not be loaded.')
    })
    return () => { active = false }
  }, [exact, opened, retry, revision])

  async function earlierReviews() {
    if (!revision?.next_before_review) return
    setBusy(true)
    setError('')
    try {
      const older = await v1<AssessmentHistory>(exact + '&before_review=' + revision.next_before_review)
      setRevision({ ...revision, reviews: [...(revision.reviews || []), ...(older.reviews || [])], next_before_review: older.next_before_review })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Earlier decisions could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  const outcome = assessmentStatusLabel('SUBMITTED', item.review_status ? { status: item.review_status } : undefined, item.revision)
  const answers = revision?.submission?.answers
  return <details open={opened} className="assessment-history-item" onToggle={event => { setOpened(event.currentTarget.open) }}>
    <summary><span><strong>Response revision {item.revision}</strong><small><time dateTime={item.submitted_at}>{new Date(item.submitted_at).toLocaleString()}</time></small></span>
      <span className={`pill ${reviewStatusTone[outcome] || ''}`}>{outcome}</span></summary>
    <div className="assessment-history-content">
      <p>Submitted by {item.submitted_by === context.actor.id ? 'you' : record.recipient?.principal_id === item.submitted_by ? record.recipient?.display_name || 'the assigned respondent' : 'the recorded respondent'}.</p>
      {!revision && !error && <p role="status">Loading response…</p>}
      {revision && !answers && <p>Submitted answers are visible to the assigned respondent and reviewer.</p>}
      {answers && visibleAssessmentFields(record, answers).map(field => <article tabIndex={-1} ref={element => { if (element && opened && !focusedQuestion.current && new URLSearchParams(window.location.search).get("field") === field.id && new URLSearchParams(window.location.search).get("submission") === item.id) { focusedQuestion.current = true; element.scrollIntoView({ block: "center" }); element.focus({ preventScroll: true }) } }} className="assessment-question" key={field.id}>
        <h3>{field.label}</h3>
        {['file', 'photo', 'signature', 'vendor_document'].includes(field.type) ?
          <AssessmentEvidence field={field} answer={answers[field.id]} submissionId={item.id} files={files?.files} fileDetailsUnavailable={files?.unavailable}/> :
          <SubmittedValue answer={answers[field.id]}/>}
        <AssessmentAnswerQuality field={field} provenance={revision?.submission?.answer_provenance?.[field.id]}/>
      </article>)}
      {revision && !revision.reviews?.length && <p>Awaiting independent review.</p>}
      {revision?.reviews?.map(review => <AssessmentReviewNotes key={review.id} review={review} record={record}/>)}
      {error && <p role="alert">{error} {!revision && <button type="button" className="text-link" onClick={() => setRetry(value => value + 1)}>Try again</button>}</p>}
      {revision?.next_before_review && <button type="button" className="button" disabled={busy} onClick={() => void earlierReviews()}>Load earlier decisions</button>}
    </div>
  </details>
}

export function AssessmentQuestionFeedback({ field, review }: {
  field: Field
  review?: AssessmentReviewReceipt
}) {
  const group = review?.groups.find(decision => decision.group_id === reviewGroupId(field))
  const question = group?.questions?.find(item => item.field_id === field.id)
  if (!question) return null
  return <aside className={`assessment-feedback ${question.outcome === 'FOLLOW_UP_REQUIRED' ? 'needs-change' : ''}`} aria-label="Reviewer feedback">
    <strong>{question.outcome === 'FOLLOW_UP_REQUIRED' ? 'Changes needed' : 'Reviewed'}</strong>
    {question.rationale && <p>{question.rationale}</p>}
  </aside>
}
