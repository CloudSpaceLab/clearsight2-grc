import { useEffect, useState } from 'react'
import type { Answer, Field } from './v1Client'
import { v1 } from './v1Client'
import { attachmentIds } from './assessmentResponseModel'
import type { DraftAttachment } from './assessmentResponseModel'

export type AssessmentFile = {
  file_name: string
  field_id: string
  artifact_id: string
  artifact_status: string
  demo_unscanned_allowed?: boolean
  demo_preview_available?: boolean
}

export function useAssessmentFiles(submissionId?: string) {
  const [result, setResult] = useState<{ id: string; files: AssessmentFile[]; unavailable?: boolean }>()
  useEffect(() => {
    if (!submissionId) return
    let active = true
    const query = new URLSearchParams({ submission_id: submissionId, current_only: 'false', limit: '100' })
    void v1<{ items: AssessmentFile[] }>('/api/v1/forms/documents?' + query).then(page => {
      if (active) setResult({ id: submissionId, files: page.items })
    }).catch(() => {
      if (active) setResult({ id: submissionId, files: [], unavailable: true })
    })
    return () => { active = false }
  }, [submissionId])
  return result?.id === submissionId ? result : undefined
}

export function AssessmentEvidence({ field, answer, submissionId, originalAnswer, files, uploads = [], fileDetailsUnavailable }: {
  field: Field
  answer?: Answer
  originalAnswer?: Answer
  submissionId?: string
  files?: AssessmentFile[]
  uploads?: DraftAttachment[]
  fileDetailsUnavailable?: boolean
}) {
  const ids = attachmentIds(field, answer)
  if (!ids.length) return null
  const retained = attachmentIds(field, originalAnswer)
  return <ul className="assessment-evidence" aria-label="Attached evidence">{ids.map((id, index) => {
    const file = files?.find(item => item.field_id === field.id && item.artifact_id === id)
    const upload = uploads.find(item => item.id === id)
    const label = file?.file_name || upload?.file_name || `Attachment ${index + 1}`
    const mayOpen = file && (file.artifact_status === 'AVAILABLE' || file.demo_unscanned_allowed || file.demo_preview_available)
    const path = submissionId && `/api/v1/forms/documents/${[submissionId, field.id, id].map(encodeURIComponent).join('/')}/content?download=true`
    return <li key={id}>
      {path && (mayOpen || (!file && retained.includes(id))) ? <a href={path} title={`Download ${label}`}>{label}</a> : <span>{label}</span>}
      {originalAnswer && retained.includes(id) ? <small>From the previous response</small> : upload || (originalAnswer && !retained.includes(id)) ? <small>Attached to draft</small> : null}
      {file && !mayOpen && <small>Download unavailable · {file.artifact_status.toLowerCase().replaceAll('_', ' ')}</small>}
      {fileDetailsUnavailable && !file && !upload && <small>File details unavailable</small>}
    </li>
  })}</ul>
}
