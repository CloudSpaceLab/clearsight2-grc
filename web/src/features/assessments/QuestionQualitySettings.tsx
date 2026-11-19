import { useState } from 'react'
import { v1 } from '../programs/v1Client'
import type { ValidationBinding } from './formAuthoringModel'
import './questionQualitySettings.css'

export type QuestionQualityOptions = { answer_validity_days?: number; validation_binding?: ValidationBinding }
const lookupTypes = new Set(['short_text', 'long_text', 'email', 'telephone', 'url', 'integer', 'decimal', 'percentage', 'currency', 'date', 'yes_no', 'single_select', 'dropdown', 'time', 'rating', 'linear_scale'])

type ApprovedBinding = {
  binding_id: string
  version: number
  name: string
  status: string
  operations: string[]
  key_fields?: string[]
  selected_fields: string[]
}

export function QuestionQualitySettings({ field, editable, update }: {
  field: QuestionQualityOptions & { type: string }
  editable: boolean
  update: (change: QuestionQualityOptions) => void
}) {
  const saved = field.validation_binding
  const [bindingId, setBindingId] = useState(saved?.binding_id ?? '')
  const [version, setVersion] = useState(saved ? String(saved.binding_version) : '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const supportsLookup = lookupTypes.has(field.type)

  async function bindSource() {
    setBusy(true)
    setMessage('')
    try {
      const binding = await v1<ApprovedBinding>(`/api/v1/forms/validation-bindings/${encodeURIComponent(bindingId.trim())}?version=${encodeURIComponent(version)}`)
      const keys = binding.key_fields ?? []
      const key = keys[0]
      if (binding.status !== 'ACTIVE' || !binding.operations.includes('LOOKUP') || keys.length !== 1 || !key || !binding.selected_fields.includes(key)) {
        setMessage('Choose an active lookup binding that returns its single lookup key.')
        return
      }
      const reference: ValidationBinding = { binding_id: binding.binding_id, binding_version: binding.version, value_field: key }
      update({ validation_binding: reference })
      setMessage(`${binding.name} selected. Save the form draft to keep this setting.`)
    } catch {
      setMessage('Could not read that binding revision. Check the ID, revision and the source’s organization.')
    } finally {
      setBusy(false)
    }
  }

  return <details className="question-quality-settings" open={saved || field.answer_validity_days ? true : undefined}>
    <summary>Expiry and source validation</summary>
    <label>Validity after submission (days)
      <input type="number" min="1" max="3650" step="1" disabled={!editable}
        value={field.answer_validity_days ?? ''} placeholder="No expiry"
        onChange={event => update({ answer_validity_days: event.target.value ? Number(event.target.value) : undefined })}/>
    </label>
    <p>The validity period covers this answer and any files attached to it.</p>
    {saved && <p>Source binding {saved.binding_id} · Revision {saved.binding_version} · Key {saved.value_field}</p>}
    {supportsLookup && editable && <>
      <p>Use an approved Source Registry lookup to validate answers on Program assessments.</p>
      <label>Source binding ID<input value={bindingId} onChange={event => setBindingId(event.target.value)} maxLength={128}/></label>
      <label>Source binding revision<input type="number" min="1" step="1" value={version} onChange={event => setVersion(event.target.value)}/></label>
      <button className="button" type="button" disabled={busy || !bindingId.trim() || !Number.isSafeInteger(Number(version)) || Number(version) < 1}
        onClick={() => void bindSource()}>Use approved binding</button>
    </>}
    {!supportsLookup && <p>Source lookup requires a single text, number, date or choice answer.</p>}
    {editable && saved && <button className="button" type="button" onClick={() => { update({ validation_binding: undefined }); setMessage('') }}>Remove source binding</button>}
    {message && <p role="status">{message}</p>}
  </details>
}
