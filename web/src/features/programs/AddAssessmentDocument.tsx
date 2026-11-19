import { attachDocumentToDraft } from './documentRegisterModel'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { v1, command, scoped } from './v1Client'
import type { RequestRecord, V1Context, Artifact } from './v1Client'
import type { AssessmentDraft, AssessmentHistory } from './assessmentResponseModel'
import { visibleAssessmentFields } from './assessmentResponseModel'

export function AddAssessmentDocument({ context, programId, requests, onSaved }: {
 context: V1Context; programId: string; requests: RequestRecord[];
 onSaved: (request: RequestRecord) => Promise<void>
}) {
 const assigned = requests.filter(item => item.form_template_id && item.recipient?.principal_id === context.actor.id)
 const [selected, setSelected] = useState('')
 const [fieldId, setFieldId] = useState('')
 const [loaded, setLoaded] = useState<{ request: RequestRecord; draft: AssessmentDraft; correction?: AssessmentHistory['correction'] }>()
 const [file, setFile] = useState<File>()
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 useEffect(() => {
  setLoaded(undefined); setError(''); setFieldId(''); setFile(undefined)
  if (!selected) return
  let active = true
  void (async () => {
   const request = await v1<RequestRecord>('/api/v1/evidence/requests/' + selected)
   if (request.subject_id !== programId || request.recipient?.principal_id !== context.actor.id) throw Error('Assessment is unavailable to this account.')
   let correction: AssessmentHistory['correction']
   if (request.status === 'SUBMITTED') {
    const history = await v1<AssessmentHistory>(scoped('/api/v1/programs/' + programId + '/assessment-responses/' + selected, context))
    correction = history.correction
    if (!correction) throw Error('This submitted assessment needs an open correction request before evidence can be changed.')
   } else if (!['READY','IN_PROGRESS'].includes(request.status)) throw Error('This assessment is closed.')
   const query = correction ? '?' + new URLSearchParams({ submission_id: correction.submission_id, review_id: correction.review_id }) : ''
   const draft = await v1<AssessmentDraft>('/api/v1/evidence/requests/' + selected + '/draft' + query)
   if (active) setLoaded({ request, draft, correction })
  })().catch(e => { if (active) setError(e.message) })
  return () => { active = false }
 }, [selected, context, programId])
 const fields = loaded ? visibleAssessmentFields(loaded.request, loaded.draft.answers).filter(field => ['file','photo','signature'].includes(field.type)) : []
 async function save(event: FormEvent) {
  event.preventDefault()
  if (!loaded || !file || !fieldId || busy) return
  setBusy(true); setError('')
  try {
   const data = new FormData()
   data.set('request_id', selected); data.set('field_id', fieldId); data.set('file', file)
   if (loaded.correction) {
    data.set('correction_submission_id', loaded.correction.submission_id)
    data.set('correction_review_id', loaded.correction.review_id)
   }
   const artifact = await v1<Artifact>('/api/v1/evidence/artifacts', { method:'POST', body:data })
   await command('/api/v1/evidence/requests/' + selected + '/draft', {
    expected_version: loaded.draft.version, presentation_mode:'AUTOMATIC', correction:loaded.correction,
    answers:attachDocumentToDraft(loaded.draft.answers,fieldId,artifact.id),
   })
   await onSaved(loaded.request)
  } catch(e) { setError(e instanceof Error ? e.message : 'Document could not be attached.') }
  finally { setBusy(false) }
 }
 return <form onSubmit={event => void save(event)}>
  <label className="program-field">Linked assessment<select required value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>
   <option value="">Choose an assigned assessment</option>{assigned.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
  </select></label>
  {!assigned.length && <p>No assessments are assigned to your account in this Program.</p>}
  {loaded && <label className="program-field">Evidence question<select required value={fieldId} disabled={busy} onChange={e=>setFieldId(e.target.value)}>
   <option value="">Choose the file question</option>{fields.map(field=><option key={field.id} value={field.id}>{field.label}</option>)}
  </select></label>}
  {loaded && !fields.length && <p>No file question applies to the saved answers.</p>}
  {fieldId && <label className="program-field">Supporting file<input key={selected+fieldId} type="file" required disabled={busy} accept={fields.find(field=>field.id===fieldId)?.accepted_formats?.join(',')} onChange={e=>setFile(e.target.files?.[0])}/></label>}
  <p>The file is saved to the assessment draft. Complete and submit the response to send it for review.</p>
  {error && <p role="alert">{error}</p>}
  <button className="button primary" disabled={busy || !loaded || !file || !fieldId}>{busy?'Saving...':'Attach to assessment draft'}</button>
 </form>
}
