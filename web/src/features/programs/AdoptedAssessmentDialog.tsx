import { useEffect, useRef, useState } from 'react'
import { RecordDialog } from './RecordDialog'
import { command, scoped, v1 } from './v1Client'
import type { RequestRecord, Template, V1Context } from './v1Client'

type Option = { adoption_id: string; template_code: string; form_template_id: string; form_template_version: number; name: string; program_version: number; reviewer_name: string; respondents: { id: string; name: string }[]; ready: boolean; blocker?: string }

export function AdoptedAssessmentDialog({ context, programId, templates, onClose, onCreated }: { context: V1Context; programId: string; templates: Template[]; onClose: () => void; onCreated: (record: RequestRecord) => Promise<void> }) {
  const [options, setOptions] = useState<Option[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const assessmentKey = useRef(crypto.randomUUID())
  useEffect(() => {
    let active = true
    void v1<{ items: Option[] }>(scoped(`/api/v1/programs/${programId}/assessment-setup`, context)).then(result => {
      if (active) { setOptions(result.items); setSelected(result.items[0] ? '0' : '') }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Assessment setup could not be loaded.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [context, programId])
  const option = selected === '' ? undefined : options[Number(selected)]
  const legacyForm = templates.find(template => selected === `collection:${template.id}`)
  return <RecordDialog title="New assessment" onClose={onClose} closeDisabled={busy}>
    <form onSubmit={event => {
      event.preventDefault()
      if ((!option?.ready && !legacyForm) || busy) return
      const data = new FormData(event.currentTarget)
      setBusy(true); setError('')
      const period = { period_start: `${data.get('start')}T00:00:00Z`, period_end: `${data.get('end')}T23:59:59Z`, deadline: `${data.get('due')}T23:59:59Z` }
      const request = option?.ready ? command<RequestRecord>(scoped(`/api/v1/programs/${programId}/assessments`, context), {
        adoption_id: option.adoption_id, assessment_key: assessmentKey.current,
        form_template_id: option.form_template_id, form_template_version: option.form_template_version,
        expected_program_version: option.program_version, respondent_principal_id: data.get('respondent'),
        ...period,
      }) : command<RequestRecord>(scoped(`/api/v1/programs/${programId}/form-templates/${legacyForm!.id}/collections`, context), { form_template_version: legacyForm!.version, ...period })
      void request.then(onCreated).catch(e => setError(e instanceof Error ? e.message : 'Assessment creation failed.')).finally(() => setBusy(false))
    }}>
      {loading && <p role="status">Loading approved adoptions and respondent assignments…</p>}
      <label className="program-field">Approved form<select value={selected} required disabled={busy || loading} onChange={event => setSelected(event.target.value)}>
        <option value="">Choose an approved questionnaire</option>{options.map((item, index) => <option key={`${item.adoption_id}:${item.form_template_id}:${item.form_template_version}`} value={index}>{item.name} · v{item.form_template_version}</option>)}
        {templates.map(template => <option key={template.id} value={`collection:${template.id}`}>{template.name} · v{template.version} · Program collection</option>)}
      </select></label>
      {!loading && !options.length && !templates.length && !error && <p role="status">No approved questionnaire is available for this Program. Complete framework adoption or configure an approved Program collection.</p>}
      {option && <>
        <p className="program-response-caption">Questionnaire version {option.form_template_version} is saved with this adoption. Independent reviewer: {option.reviewer_name}.</p>
        {option.blocker && <p role="status">{option.blocker}</p>}
        <label className="program-field">Respondent<select key={selected} name="respondent" required disabled={busy || !option.ready} defaultValue=""><option value="">Choose a person in an adopted unit</option>{option.respondents.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
      </>}
      <label className="program-field">Period start<input name="start" type="date" required disabled={busy}/></label>
      <label className="program-field">Period end<input name="end" type="date" required disabled={busy}/></label>
      <label className="program-field">Response due date<input name="due" type="date" required disabled={busy}/></label>
      {error && <p role="alert">{error}</p>}
      <div className="program-dialog-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || loading || (!option?.ready && !legacyForm)}>{busy ? 'Creating assessment…' : 'Create assessment'}</button></div>
    </form>
  </RecordDialog>
}
