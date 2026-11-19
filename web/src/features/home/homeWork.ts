export type WorkScope = { principal_id: string; tenant_id: string; legal_entity_id: string }
export function workScopeMatches(scope: WorkScope | undefined, actor: string, tenant: string, entity: string) {
  return scope?.principal_id === actor && scope.tenant_id === tenant && scope.legal_entity_id === entity
}
export function hasDueDate(due: string | undefined): due is string {
  return !!due && !due.startsWith('0001-') && Number.isFinite(Date.parse(due))
}
export function isOverdue(due: string | undefined, asOf: string) {
  return hasDueDate(due) && Number.isFinite(Date.parse(asOf)) && Date.parse(due) < Date.parse(asOf)
}
