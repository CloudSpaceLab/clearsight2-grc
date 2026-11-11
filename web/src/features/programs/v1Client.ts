export type V1Context = { tenant: { id: string; name: string }; legal_entity: { id: string; name: string }; actor: { id: string; name: string }; demo_mode?: boolean; mode: string }
export type Answer = { text?: string; values?: string[]; artifact_ids?: string[] }
export type Field = { id: string; label: string; type: string; required: boolean; options?: string[]; attestation?: string; condition?: unknown }
export type RequestRecord = { id: string; title: string; purpose: string; subject_type: string; subject_id: string; status: string; version: number; fields: Field[]; recipient?: { principal_id?: string; display_name?: string }; form_template_id?: string; deadline: string; updated_at: string }
export type Program = { id: string; code: string; name: string; status: string; owning_function: string; jurisdiction: string; version: number; updated_at: string; legal_entity_id: string }
export type Aggregate = { program: Program; requirements: { id: string; code: string; title: string }[]; current_state?: { overall: string; reasons?: { summary: string }[] }; evidence_contracts?: { id: string; name?: string; title?: string }[] }
export type Template = { id: string; name: string; version: number; status: string; is_current: boolean; fields: Field[] }
export type Matter = { id: string; reference: string; title: string; summary: string; status: string; priority: number; version: number; updated_at: string; due_at?: string; owner_principal_id?: string; scope?: unknown }
export type MatterAggregate = { matter: Matter; links: { program_id?: string; retired_at?: string }[] }
export type Artifact = { id: string; file_name: string; status: string; sha256: string; size_bytes: number }
export type DocumentRecord = { file_name: string; submission_id: string; field_id: string; artifact_id: string; response_revision_id: string; form_template_id: string; request_id?: string; scan_status?: string }
export type Receipt = { submission_id: string; request_id: string; status: string; submitted_at: string }
export type Submission = { id: string; answers: Record<string, Answer>; submitted_at: string; submitted_by?: string }
export class V1Error extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }
export async function v1<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/api/v1/')) throw Error('Invalid API path')
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new V1Error(response.status, typeof body?.message === 'string' ? body.message : `Service returned ${response.status}`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
export const command = <T,>(path: string, body: unknown) => v1<T>(path, { method: 'POST', body: JSON.stringify(body) })
export function scoped(path: string, context: V1Context) { return `${path}${path.includes('?') ? '&' : '?'}tenant_id=${encodeURIComponent(context.tenant.id)}` }
export function programRequests(items: RequestRecord[], programId: string) { return items.filter(r => r.subject_type === 'PROGRAM' && r.subject_id === programId) }
export function isSupportingDocumentRequest(record: RequestRecord) { return !record.form_template_id && record.purpose === 'Supporting documentation for the selected Program' }
export function latestRequests(items: RequestRecord[]) { return [...items].sort((a,b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) || a.id.localeCompare(b.id)) }
export function programMatters(items: MatterAggregate[], programId: string) { return items.filter(r => r.links?.some(l => l.program_id === programId && !l.retired_at)) }
