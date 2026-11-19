import { useState } from 'react'
import { RecordDialog } from './RecordDialog'
import { command, scoped, v1 } from './v1Client'
import type { V1Context } from './v1Client'
import { responsibilityLabel, verifyActivationSnapshot } from './programActivationModel'
import type { ActivationAggregate, ActivationOperations } from './programActivationModel'
import { settingsCommand } from './programSettingsModel'

export function ProgramSettings({ context, aggregate, operations, onClose, onChanged }: { context: V1Context; aggregate: ActivationAggregate; operations?: ActivationOperations; onClose: () => void; onChanged: () => void }) {
  const p = aggregate.program
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [stale, setStale] = useState(false)
  const operation = operations?.operations.find(o => o.command === 'program.details.update')
  const allowed = !!operations?.authority_available && !!operation?.can_act
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!allowed || busy || stale) return
    const fields = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      const path = `/api/v1/programs/${encodeURIComponent(p.id)}`
      const [current, permissions] = await Promise.all([v1<ActivationAggregate>(scoped(path, context)), v1<ActivationOperations>(scoped(`${path}/operations`, context))])
      verifyActivationSnapshot(current, permissions, { programId: p.id, tenantId: context.tenant.id, entityId: context.legal_entity.id })
      if (current.program.version !== p.version) { setStale(true); throw Error('This Program changed. Close settings and refresh before saving.') }
      if (!permissions.authority_available || !permissions.operations.some(o => o.command === 'program.details.update' && o.can_act)) throw Error('Your permission to edit this Program has changed. Close settings and refresh.')
      const body = settingsCommand({ aggregate, operations: operations! }, { aggregate: current, operations: permissions }, { name: String(fields.get('name')), function: String(fields.get('function')), jurisdiction: String(fields.get('jurisdiction')), rationale: String(fields.get('rationale')) })
      await command(scoped(`${path}/details`, context), body)
      onChanged(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Program settings could not be saved.') } finally { setBusy(false) }
  }
  return <RecordDialog title="Program settings" onClose={onClose} closeDisabled={busy}><form onSubmit={event => void save(event)}>
    <label className="program-field">Program name<input name="name" defaultValue={p.name} required maxLength={150} disabled={!allowed || stale || busy}/></label>
    <label className="program-field">Accountable function<input name="function" defaultValue={p.owning_function} required maxLength={100} disabled={!allowed || stale || busy}/></label>
    <label className="program-field">Jurisdiction<input name="jurisdiction" defaultValue={p.jurisdiction || ''} maxLength={80} disabled={!allowed || stale || busy}/></label>
    <label className="program-field">Accountable owner<input readOnly value={operations ? responsibilityLabel({ aggregate, operations }, 'ACCOUNTABLE_OWNER') : 'Name unavailable'}/></label>
    <label className="program-field">Next Program review<input readOnly value="Not configured"/></label>
    <p className="overview-note">Owner assignments require a responsibility change. Program review dates are not supported by the current settings service; assessment schedules remain separate.</p>
    {allowed ? <label className="program-field">Reason for change<textarea name="rationale" required maxLength={2000} rows={3} disabled={stale || busy}/></label> : <p role="status">{operation?.reason || 'Editing permission could not be confirmed. Close settings and refresh the Program.'}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="program-dialog-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Close</button>{allowed && <button className="button primary" disabled={busy || stale}>{busy ? 'Saving…' : 'Save Program settings'}</button>}</div>
  </form></RecordDialog>
}
