import { useEffect, useState } from 'react'
import { command, scoped } from './v1Client'
import type { RequestRecord, Submission, V1Context } from './v1Client'

export type GroupDecision = { group_id: string; outcome: 'REVIEWED' | 'FOLLOW_UP_REQUIRED'; rationale: string; artifact_ids?: string[] }
export type AssessmentReviewReceipt = { id: string; request_id: string; submission_id: string; status: string; rationale: string; groups: GroupDecision[]; reviewed_by: string; version: number; created_at: string }

export function AssessmentReview({ context, programId, record, submission, review, onRecorded }: { context: V1Context; programId: string; record: RequestRecord; submission: Submission | null; review?: AssessmentReviewReceipt; onRecorded: () => Promise<void> }) {
  const groupIds = [...new Set(record.fields.map(field => field.section_id || 'all'))]
  const [decisions, setDecisions] = useState<GroupDecision[]>([])
  const [rationale, setRationale] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setDecisions(groupIds.map(id => review?.groups.find(group => group.group_id === id) || { group_id: id, outcome: 'REVIEWED', rationale: '' }))
    setRationale(review?.rationale || ''); setError(''); setSaved(false)
  }, [record.id, review?.id])
  const canReview = record.status === 'SUBMITTED' && record.known_facts?.reviewer === context.actor.id && record.created_by !== context.actor.id && submission?.submitted_by !== context.actor.id && !!submission
  return <section className="v1-question" aria-label="Independent assessment review">
    <h3>Independent evidence review</h3>
    <p>Review the answers and original documents for each question group. This decision records evidence quality; it does not establish ISO compliance.</p>
    {review && <div className="program-context-empty"><strong>{review.status === 'REVIEWED' ? 'Evidence reviewed' : 'Follow-up required'} · Review {review.version}</strong><p>{review.rationale}</p><small>Recorded {new Date(review.created_at).toLocaleString()} · Submission {review.submission_id}</small></div>}
    {!canReview ? <p>{review ? 'The saved independent decision is shown above.' : 'The assigned independent reviewer can record a decision after submission.'}</p> : <form onSubmit={event => {
      event.preventDefault(); if (busy) return
      setBusy(true); setError(''); setSaved(false)
      void command<AssessmentReviewReceipt>(scoped(`/api/v1/programs/${programId}/assessment-reviews/${record.id}`, context), { expected_version: review?.version || 0, rationale, groups: decisions })
        .then(async () => { setSaved(true); await onRecorded() })
        .catch(e => setError(e instanceof Error ? e.message : 'The independent review could not be recorded.'))
        .finally(() => setBusy(false))
    }}>
      {decisions.map((decision, index) => <fieldset className="v1-question" key={decision.group_id} disabled={busy}>
        <legend>{record.sections?.find(section => section.id === decision.group_id)?.title || (decision.group_id === 'all' ? 'All questions' : decision.group_id)}</legend>
        <label className="program-field">Evidence decision<select value={decision.outcome} onChange={event => setDecisions(previous => previous.map((item, i) => i === index ? { ...item, outcome: event.target.value as GroupDecision['outcome'] } : item))}><option value="REVIEWED">Reviewed</option><option value="FOLLOW_UP_REQUIRED">Follow-up required</option></select></label>
        <label className="program-field">Reason for this decision<textarea value={decision.rationale} onChange={event => setDecisions(previous => previous.map((item, i) => i === index ? { ...item, rationale: event.target.value } : item))} required maxLength={4000} rows={3}/></label>
      </fieldset>)}
      <label className="program-field">Overall review rationale<textarea value={rationale} onChange={event => setRationale(event.target.value)} required maxLength={4000} rows={3} disabled={busy}/></label>
      {error && <p role="alert">{error}</p>}{saved && <p role="status">Independent review recorded.</p>}
      <div className="program-dialog-actions"><button className="button primary" disabled={busy}>{busy ? 'Recording review…' : 'Record independent review'}</button></div>
    </form>}
  </section>
}
