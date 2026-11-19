import { useState } from 'react'
import type { FormEvent } from 'react'
import { command, scoped } from './v1Client'
import type { RequestRecord, Submission, V1Context } from './v1Client'
import type { AssessmentReviewReceipt, GroupDecision, QuestionDecision } from './assessmentResponseModel'
import { reviewGroupId, visibleAssessmentFields } from './assessmentResponseModel'
import { AssessmentEvidence } from './AssessmentEvidence'
import type { AssessmentFile } from './AssessmentEvidence'
import { RecordDialog } from './RecordDialog'

export type { AssessmentReviewReceipt } from './assessmentResponseModel'

export function SubmittedValue({ answer }: { answer: Submission['answers'][string] | undefined }) {
  if (answer?.text?.trim()) return <p className="assessment-value">{answer.text}</p>
  if (answer?.values?.length) return <p className="assessment-value">{answer.values.join(', ')}</p>
  if (answer?.artifact_ids?.length || answer?.document?.artifact_id) return null
  return <p>No answer recorded.</p>
}

export function AssessmentReview({ context, programId, record, submission, expectedVersion, files, onClose, onRecorded }: {
  context: V1Context
  programId: string
  record: RequestRecord
  submission: Submission
  expectedVersion: number
  files?: AssessmentFile[]
  onClose: () => void
  onRecorded: (review: AssessmentReviewReceipt) => Promise<void>
}) {
  const fields = visibleAssessmentFields(record, submission.answers)
  const [decisions, setDecisions] = useState<Record<string, Partial<QuestionDecision>>>({})
  const [rationale, setRationale] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const correction = Object.values(decisions).some(decision => decision.outcome === 'FOLLOW_UP_REQUIRED')

  function update(fieldId: string, value: Partial<QuestionDecision>) {
    setDecisions(current => ({ ...current, [fieldId]: { ...current[fieldId], ...value } }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const due = String(new FormData(event.currentTarget).get('correction_due') || '')
    const groups = new Map<string, GroupDecision>()
    for (const field of record.fields) {
      const id = reviewGroupId(field)
      groups.set(id, groups.get(id) || { group_id: id, outcome: 'REVIEWED', rationale, questions: [] })
    }
    for (const field of fields) {
      const decision = decisions[field.id]
      if (!decision?.outcome || (decision.outcome === 'FOLLOW_UP_REQUIRED' && !decision.rationale?.trim())) return
      const group = groups.get(reviewGroupId(field))!
      group.questions?.push({ field_id: field.id, outcome: decision.outcome, rationale: decision.rationale })
      if (decision.outcome === 'FOLLOW_UP_REQUIRED') group.outcome = 'FOLLOW_UP_REQUIRED'
    }
    setError('')
    setBusy(true)
    try {
      const deadline = correction ? new Date(due + 'T23:59:59') : null
      if (deadline && (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now())) {
        setError('Choose a future correction deadline.')
        return
      }
      const review = await command<AssessmentReviewReceipt>(
        scoped(`/api/v1/programs/${programId}/assessment-reviews/${record.id}`, context),
        { submission_id: submission.id, expected_version: expectedVersion, rationale, groups: [...groups.values()], correction_due_at: deadline?.toISOString() },
      )
      await onRecorded(review)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  return <RecordDialog title="Review submitted answers" closeDisabled={busy} onClose={onClose}>
    <p className="assessment-dialog-intro">Response revision {submission.revision || 1} · {record.title}</p>
    <form className="assessment-review-form" onSubmit={event => void save(event)}>
      <fieldset disabled={busy}>
        <legend className="sr-only">Decisions on submitted questions</legend>
        {fields.map((field, index) => {
          const answer = submission.answers[field.id]
          const decision = decisions[field.id]
          return <section key={field.id} className="assessment-question">
            <small>Question {index + 1}</small>
            <h3>{field.label}</h3>
            <div className="assessment-submitted">
              <small>Submitted answer</small>
              {['file', 'photo', 'signature', 'vendor_document'].includes(field.type) ? <AssessmentEvidence field={field} answer={answer} submissionId={submission.id} files={files}/> : <SubmittedValue answer={answer}/>}
            </div>
            <label className="program-field">Outcome
              <select required value={decision?.outcome || ''} onChange={event => update(field.id, { outcome: event.target.value as QuestionDecision['outcome'] })}>
                <option value="">Choose a decision</option><option value="REVIEWED">Reviewed</option><option value="FOLLOW_UP_REQUIRED">Changes needed</option>
              </select>
            </label>
            <label className="program-field">{decision?.outcome === 'FOLLOW_UP_REQUIRED' ? 'What should the respondent change?' : 'Review rationale (optional)'}
              <textarea required={decision?.outcome === 'FOLLOW_UP_REQUIRED'} maxLength={4000} rows={2} value={decision?.rationale || ''} onChange={event => update(field.id, { rationale: event.target.value })}/>
            </label>
          </section>
        })}
        <label className="program-field">Overall review rationale<textarea required maxLength={4000} rows={3} value={rationale} onChange={event => setRationale(event.target.value)}/></label>
        {correction && <label className="program-field">Correction due date<input type="date" name="correction_due" required/><small>Due at the end of the selected day in your local time zone.</small></label>}
      </fieldset>
      {error && <p className="assessment-error" role="alert">{error}</p>}
      <div className="program-dialog-actions"><button className="button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Recording…' : correction ? 'Request changes' : 'Record review'}</button></div>
    </form>
  </RecordDialog>
}
