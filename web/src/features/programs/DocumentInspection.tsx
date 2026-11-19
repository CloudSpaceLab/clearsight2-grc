import { DocumentPDFPreview } from './DocumentPDFPreview'
import { previewKind } from './documentRegisterModel'
import { useEffect, useState } from 'react'
import { RecordDialog } from './RecordDialog'
import { v1, scoped } from './v1Client'
import type { V1Context } from './v1Client'
import type { AssessmentHistory } from './assessmentResponseModel'

export type ProgramDocument = {
  current: boolean; form_title: string; field_label: string; submitted_at: string;
  submitted_by?: string; submitted_by_name?: string; assessment_revision?: number;
  request_id: string; file_name: string; submission_id: string; field_id: string; artifact_id: string;
  response_revision_id?: string; artifact_status: string; demo_unscanned_allowed?: boolean;
  demo_preview_available?: boolean; media_type?: string; size_bytes: number; sha256: string;
  answer_expires_at?: string; review?: { status: string };
}
export function documentContentPath(doc: ProgramDocument) {
  const params = new URLSearchParams()
  if (doc.response_revision_id) params.set('response_revision_id', doc.response_revision_id)
  return '/api/v1/forms/documents/' + [doc.submission_id, doc.field_id, doc.artifact_id].map(encodeURIComponent).join('/') + '/content?' + params
}
export function DocumentInspection({ document: doc, context, programId }: {
  document: ProgramDocument; context: V1Context; programId: string
}) {
  const [history, setHistory] = useState<AssessmentHistory>()
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [content, setContent] = useState<{ url?: string; text?: string; type: string }>()
  const [previewError, setPreviewError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    if (doc.response_revision_id) return
    const path = scoped('/api/v1/programs/' + programId + '/assessment-responses/' + doc.request_id + '?submission_id=' + doc.submission_id, context)
    void v1<AssessmentHistory>(path).then(value => { if (active) setHistory(value) })
      .catch(() => { if (active) setError('Assessment review notes are unavailable for this document.') })
    return () => { active = false }
  }, [doc, context, programId])
  useEffect(() => {
    if (!preview) return
    let active = true
    let objectURL = ''
    setLoading(true); setPreviewError('')
    void (async () => {
      const response = await fetch(documentContentPath(doc), { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw Error('Preview is unavailable. Access and file checks are enforced.')
      const type = (response.headers.get('Content-Type') || '').split(';')[0] || ''
      const blob = await response.blob()
      if (previewKind(type) === 'text') {
        if (blob.size > 2 * 1024 * 1024) throw Error('This text file is too large to preview. Download the original.')
        const text = await blob.text()
        if (active) setContent({ text, type })
      } else if (['pdf', 'image'].includes(previewKind(type))) {
        objectURL = URL.createObjectURL(blob)
        if (active) setContent({ url: objectURL, type })
      } else throw Error('Preview is unavailable for this file type. Download the original.')
    })().catch(e => { if (active) setPreviewError(String(e.message)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [preview, doc, retry])
  const latest = history?.reviews?.[0]
  const group = latest?.groups.find(item => item.artifact_ids?.includes(doc.artifact_id))
  const question = group?.questions?.find(item => item.field_id === doc.field_id)
  const name = doc.submitted_by_name || (doc.submitted_by === context.actor.id ? context.actor.name : 'Recorded respondent')
  const allowed = doc.artifact_status === 'AVAILABLE' || doc.demo_unscanned_allowed || doc.demo_preview_available
  return <>
    <dl className="program-document-facts">
      <div><dt>Submitted by</dt><dd>{name}</dd></div>
      <div><dt>Response revision</dt><dd>{doc.assessment_revision || history?.submission?.revision || 'Unavailable'}</dd></div>
    </dl>
    <section className="document-review-notes" aria-label="Document review notes">
      <h3>Review notes for this file</h3>
      {question || group ? <><p>{question?.outcome === 'FOLLOW_UP_REQUIRED' || (!question && group?.outcome === 'FOLLOW_UP_REQUIRED') ? 'Changes needed' : 'Reviewed'}</p>
        <p>{question?.rationale || group?.rationale || latest?.rationale}</p>
        <small>{question ? 'Question decision' : 'Question group decision'} recorded {latest && new Date(latest.created_at).toLocaleString()}</small></> :
        <p>{error || (doc.response_revision_id ? 'Open the linked response to inspect its saved review.' : history ? 'No review decision has been recorded for this file.' : 'Loading review notes...')}</p>}
    </section>
    <button type="button" className="button" disabled={!allowed} onClick={() => setPreview(true)}>Preview document</button>
    {preview && <RecordDialog title={'Preview ' + doc.file_name} onClose={() => { setPreview(false); setContent(undefined) }}>
      {loading && <p role="status">Loading preview...</p>}
      {previewError && <p role="alert">{previewError} <button type="button" className="text-link" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
      {content?.text !== undefined && <pre className="document-text-preview">{content.text}</pre>}
      {content?.url && (content.type === 'application/pdf' ? <DocumentPDFPreview url={content.url} title={doc.file_name}/> : <img className="document-preview" src={content.url} alt={doc.file_name}/>)}
    </RecordDialog>}
  </>
}
