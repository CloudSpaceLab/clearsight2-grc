import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AssessmentSchedules } from './AssessmentSchedules'
import { command, scoped, v1 } from './v1Client'
import type { RequestRecord, Template, V1Context } from './v1Client'

type Policy = { validity_months: number; renewal_window_days: number; reminder_count: number }
type Check = { id: string; name: string; version: number; status: string; is_current: boolean; input_kind?: string; owner_principal_id?: string; form_template_id?: string; collection_policy?: Policy }
type Operation = { command: string; subresource_id?: string; can_act: boolean; reason?: string; allowed_targets?: string[] }
const defaultPolicy: Policy = { validity_months: 12, renewal_window_days: 30, reminder_count: 3 }

export function AssessmentConfiguration({ context, programId, record, template, cycle, initialOpen, onMessage }: {
  context: V1Context
  programId: string
  record: RequestRecord
  template?: Template
  cycle: string
  initialOpen?: boolean
  onMessage: (message: string) => void
}) {
  return <div className="assessment-configuration">
    <section className="assessment-question">
      <h3>Assessment configuration</h3>
      <dl className="program-document-facts">
        <div><dt>Form</dt><dd>{template?.name || record.title}{record.form_template_version ? ` · Version ${record.form_template_version}` : ''}</dd></div>
        <div><dt>Respondent</dt><dd>{record.recipient?.display_name || 'Assigned respondent'}</dd></div>
        <div><dt>Reporting period</dt><dd>{cycle || 'Unavailable'}</dd></div>
        <div><dt>Response due</dt><dd><time dateTime={record.deadline}>{new Date(record.deadline).toLocaleString()}</time></dd></div>
        <div><dt>Review</dt><dd>Independent Program reviewer</dd></div>
      </dl>
    </section>
    <section className="assessment-question"><h3>Recurring assessments</h3>
      <p>Approved schedules create new cycles on a calendar cadence. Event-triggered schedules are unavailable.</p>
      <AssessmentSchedules context={context} programId={programId} initialOpen={initialOpen} compact/>
    </section>
    <details className="assessment-history-item">
      <summary><strong>Response renewal policy</strong></summary>
      <div className="assessment-history-content"><CollectionPolicy context={context} programId={programId} record={record} onMessage={onMessage}/></div>
    </details>
  </div>
}

function CollectionPolicy({ context, programId, record, onMessage }: {
  context: V1Context; programId: string; record: RequestRecord; onMessage: (message: string) => void
}) {
  const [checks, setChecks] = useState<Check[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [selected, setSelected] = useState('')
  const [values, setValues] = useState(defaultPolicy)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function load() {
    const [checkPage, rights] = await Promise.all([
      v1<{ items: Check[] }>(scoped(`/api/v1/programs/${programId}/monitoring-checks?limit=100`, context)),
      v1<{ operations: Operation[] }>(scoped(`/api/v1/programs/${programId}/operations`, context)),
    ])
    setChecks(checkPage.items)
    setOperations(rights.operations)
  }
  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : 'Collection policy is unavailable.')) }, [context, programId])
  const active = checks.filter(check => check.is_current && check.status === 'ACTIVE' && check.input_kind === 'FORM' &&
    (!record.form_template_id || check.form_template_id === record.form_template_id))
  const current = active.find(check => check.id === selected)
  const newest = checks.filter(check => check.id === selected).sort((a, b) => b.version - a.version)[0]
  const rights = operations.find(operation => operation.command === 'program.monitoring.transition' && operation.subresource_id === newest?.id && operation.can_act)
  const canPropose = current?.owner_principal_id === context.actor.id
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    try { await action(); await load(); onMessage(message) }
    catch (e) { setError(e instanceof Error ? e.message : 'The collection policy could not be saved.') }
    finally { setBusy(false) }
  }
  function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current || !canPropose) return
    void run(() => command(scoped(`/api/v1/monitoring-checks/${current.id}/collection-policy`, context), {
      expected_version: current.version, collection_policy: values,
    }), 'Collection-policy draft saved for independent approval.')
  }
  function transition(to: string) {
    if (!newest || !rights?.allowed_targets?.includes(to)) return
    void run(() => command(scoped(`/api/v1/monitoring-checks/${newest.id}/transition`, context), {
      expected_version: newest.version, to,
    }), to === 'ACTIVE' ? 'Collection policy approved and activated.' : 'Collection policy submitted for approval.')
  }
  return <>
    <p>Validity and reminders apply to collected responses. Changes require independent approval.</p>
    <label className="program-field">Form collection<select value={selected} onChange={event => {
      setSelected(event.target.value)
      setValues(active.find(check => check.id === event.target.value)?.collection_policy || defaultPolicy)
    }}><option value="">Choose a current form collection</option>{active.map(check => <option value={check.id} key={check.id}>{check.name}</option>)}</select></label>
    {current?.collection_policy && <p>Valid for {current.collection_policy.validity_months} months · renewal opens {current.collection_policy.renewal_window_days} days before expiry · {current.collection_policy.reminder_count} reminders</p>}
    {canPropose && <form onSubmit={propose} className="assessment-question">
      <h3>Propose renewal settings</h3>
      {([['validity_months', 'Validity (months)', 120], ['renewal_window_days', 'Renewal window (days)', 90], ['reminder_count', 'Reminder count', 5]] as const).map(([key, label, max]) =>
        <label key={key} className="program-field">{label}<input type="number" min={1} max={max} value={values[key]} required onChange={event => setValues(previous => ({ ...previous, [key]: Number(event.target.value) }))}/></label>)}
      <button className="button" disabled={busy}>Save policy draft</button>
    </form>}
    {newest?.status === 'DRAFT' && rights?.allowed_targets?.includes('PENDING_APPROVAL') && <button type="button" className="button" disabled={busy} onClick={() => transition('PENDING_APPROVAL')}>Submit policy for review</button>}
    {newest?.status === 'PENDING_APPROVAL' && rights?.allowed_targets?.includes('ACTIVE') && <button type="button" className="button primary" disabled={busy} onClick={() => transition('ACTIVE')}>Approve and activate policy</button>}
    {!active.length && !error && <p>No active form collection settings are available for this assessment.</p>}
    {error && <p className="assessment-error" role="alert">{error}</p>}
  </>
}
