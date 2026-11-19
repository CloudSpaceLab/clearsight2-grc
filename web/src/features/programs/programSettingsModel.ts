import type { ActivationSnapshot } from './programActivationModel'

export function settingsCommand(reviewed: ActivationSnapshot, current: ActivationSnapshot, fields: { name: string; function: string; jurisdiction: string; rationale: string }) {
  const p = current.aggregate.program
  if (p.id !== reviewed.aggregate.program.id || p.version !== reviewed.aggregate.program.version) throw Error('This Program changed. Close settings and refresh before saving.')
  if (!current.operations.authority_available || !current.operations.operations.some(o => o.command === 'program.details.update' && o.can_act)) throw Error('Your permission to edit this Program has changed. Close settings and refresh.')
  const name = fields.name.trim(), owningFunction = fields.function.trim(), rationale = fields.rationale.trim(), jurisdiction = fields.jurisdiction.trim()
  if (!name || name.length > 150 || !owningFunction || owningFunction.length > 100 || jurisdiction.length > 80 || !rationale || rationale.length > 2000) throw Error('Enter a Program name, accountable function and reason within the field limits.')
  return { tenant_id: p.tenant_id, expected_version: p.version, name, owning_function: owningFunction, jurisdiction, scope: p.scope, effective_from: p.effective_from, effective_until: p.effective_until || null, rationale }
}
