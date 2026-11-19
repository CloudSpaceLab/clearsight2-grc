import { useEffect, useState } from 'react'
import type { AnswerProvenance, Field } from './v1Client'
import { answerValidityStatus } from './v1Client'

const sourceStates: Record<string, string> = {
  CURRENT: 'Matched approved source',
  NOT_FOUND: 'No match in approved source',
  STALE: 'Source data is stale',
  UNAVAILABLE: 'Source unavailable',
  PARTIAL: 'Source data is incomplete',
  SCHEMA_DRIFT: 'Source format changed',
  AMBIGUOUS: 'Multiple source records matched',
  INVALID: 'Source result could not be verified',
}

export function AssessmentAnswerQuality({ field, provenance }: {
  field: Field
  provenance?: AnswerProvenance
}) {
  const expiresAt = provenance?.expires_at
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!Number.isFinite(deadline)) return
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [deadline])

  const expired = answerValidityStatus(expiresAt, now) === 'Expired'
  return <>
    {expiresAt && Number.isFinite(deadline) ? <p>
      <span className={`pill ${expired ? 'incomplete' : 'received'}`}>{expired ? 'Expired' : 'Current'}</span>
      {' '}{expired ? 'Expired on' : 'Expires on'}{' '}
      <time dateTime={expiresAt}>{new Date(deadline).toLocaleString()}</time>
    </p> : field.answer_validity_days ? <p>Valid for {field.answer_validity_days} {field.answer_validity_days === 1 ? 'day' : 'days'} after submission.</p> : null}
    {provenance?.validations?.map(result => <p key={`${result.binding_id}:${result.binding_version}`}>
      <strong>Source check at submission</strong> · {sourceStates[result.state] || 'Result unavailable'}
      {' · '}{result.binding_name || result.source_id || result.binding_id} · Revision {result.binding_version}
      {result.receipt?.observed_at && <> · Observed <time dateTime={result.receipt.observed_at}>{new Date(result.receipt.observed_at).toLocaleString()}</time></>}
    </p>)}
  </>
}
