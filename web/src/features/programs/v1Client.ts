export type V1Context = { tenant: { id: string; name: string }; legal_entity: { id: string; name: string }; actor: { id: string; name: string }; demo_mode?: boolean; mode: string }
export type Answer = {
  text?: string
  values?: string[]
  artifact_ids?: string[]
  document?: { artifact_id?: string; document_type?: string; issued_on?: string; expires_on?: string }
}
export type VisibilityCondition = { field_id: string; operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'ANSWERED'; values?: string[] }
export type Field = {
  id: string
  label: string
  type: string
  required: boolean
  description?: string
  options?: string[]
  attestation?: string
  condition?: VisibilityCondition
  section_id?: string
  rows?: string[]
  columns?: string[]
  scale_max?: number
  image?: { data: string; alt: string }
  accepted_formats?: string[]
  answer_validity_days?: number
  constraints?: { min_length?: number; max_length?: number; minimum?: number; maximum?: number; step?: number }
}
export type RequestRecord = {
  id: string
  title: string
  purpose: string
  subject_type: string
  subject_id: string
  status: string
  version: number
  fields: Field[]
  recipient?: { principal_id?: string; display_name?: string }
  form_template_id?: string
  form_template_version?: number
  known_facts?: Record<string, string>
  origin?: { type: string }
  sections?: { id: string; title: string; condition?: VisibilityCondition }[]
  created_by?: string
  deadline: string
  updated_at: string
  collection_period_start?: string
  collection_period_end?: string
  latest_assessment_submission_id?: string
  latest_assessment_revision?: number
}
export type Program = { id: string; code: string; name: string; status: string; owning_function: string; jurisdiction: string; version: number; updated_at: string; legal_entity_id: string }
export type Aggregate = { program: Program; requirements: { id: string; code: string; title: string }[]; current_state?: { overall: string; reasons?: { summary: string }[] }; evidence_contracts?: { id: string; name?: string; title?: string }[] }
export type Template = { id: string; name: string; version: number; status: string; is_current: boolean; fields: Field[] }
export type Matter = { id: string; reference: string; title: string; summary: string; status: string; priority: number; version: number; updated_at: string; due_at?: string; owner_principal_id?: string; scope?: unknown; source_type?: string; source_id?: string }
export type MatterAggregate = { matter: Matter; links: { program_id?: string; retired_at?: string }[] }
export type Artifact = { id: string; file_name: string; status: string; sha256: string; size_bytes: number }
export type DocumentRecord = { file_name: string; submission_id: string; field_id: string; artifact_id: string; response_revision_id: string; form_template_id: string; request_id?: string; scan_status?: string }
export type Receipt = { submission_id: string; request_id: string; status: string; submitted_at: string; revision?: number }
export type SourceValidation = { binding_id: string; binding_name?: string; binding_version: number; source_id?: string; state: string; receipt?: { observed_at: string } }
export type AnswerProvenance = { expires_at?: string; validations?: SourceValidation[] }
export function answerValidityStatus(expiresAt: string | undefined, now: number) {
  if (!expiresAt) return 'No expiry configured'
  const deadline = Date.parse(expiresAt)
  if (!Number.isFinite(deadline)) return 'Validity unavailable'
  return now >= deadline ? 'Expired' : 'Current'
}
export type Submission = { answer_provenance?: Record<string, AnswerProvenance>; id: string; answers: Record<string, Answer>; submitted_at: string; submitted_by?: string; revision?: number; correction_of?: string }
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

export type AssessmentActivity = {actor_name?: string; id: string; request_id: string; title: string; event: string; actor: string; at: string}
export type RequirementReview = {id: string; title: string; area: string; outcome: 'REVIEWED' | 'FOLLOW_UP_REQUIRED' | 'UNASSESSED'}
export type AssessmentWorkspace = {requirement_reviews?: RequirementReview[]; items: RequestRecord[]; limited: boolean; assessment_count: number; responses_to_review: number; documents_to_review: number; activities: AssessmentActivity[]; activities_limited: boolean}
