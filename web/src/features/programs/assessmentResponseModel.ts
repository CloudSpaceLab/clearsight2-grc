import type { Answer, Artifact, Field, RequestRecord, Submission } from './v1Client'

export type EvidenceOutcome = 'REVIEWED' | 'FOLLOW_UP_REQUIRED'
export type QuestionDecision = { field_id: string; outcome: EvidenceOutcome; rationale?: string; artifact_ids?: string[] }
export type GroupDecision = { group_id: string; outcome: EvidenceOutcome; rationale: string; artifact_ids?: string[]; questions?: QuestionDecision[] }
export type AssessmentReviewReceipt = {
  id: string
  request_id: string
  submission_id: string
  status: string
  rationale: string
  groups: GroupDecision[]
  reviewed_by: string
  version: number
  created_at: string
  correction_due_at?: string
}
export type CorrectionReference = { submission_id: string; review_id: string }
export type CorrectionWindow = CorrectionReference & { due_at: string }
export type AssessmentRevisionSummary = {
  id: string
  revision: number
  correction_of?: string
  submitted_at: string
  submitted_by?: string
  review_status?: string
  can_read: boolean
}
export type AssessmentHistory = {
  revisions: AssessmentRevisionSummary[]
  latest_review_version: number
  can_review: boolean
  correction?: CorrectionWindow
  submission?: Submission
  reviews?: AssessmentReviewReceipt[]
  next_before_revision?: number
  next_before_review?: number
}
export type DraftAttachment = Pick<Artifact, 'id' | 'file_name' | 'status' | 'size_bytes'>
export type AssessmentDraft = { answers: Record<string, Answer>; version: number; attachments?: DraftAttachment[] }

export const isAssessmentDraft = (record: RequestRecord) => ['READY', 'IN_PROGRESS', 'OPEN', 'DRAFT'].includes(record.status)

export function attachmentIds(field: Field, answer?: Answer) {
  if (!answer) return []
  if (answer.document?.artifact_id) return [answer.document.artifact_id]
  if (answer.artifact_ids?.length) return answer.artifact_ids
  return ['file', 'photo', 'signature'].includes(field.type) && answer.text ? [answer.text.trim()] : []
}

export function answerPresent(answer?: Answer) {
  return !!(answer?.text?.trim() || answer?.values?.some(value => value.trim()) ||
    answer?.artifact_ids?.length || answer?.document?.artifact_id)
}

function conditionMatches(condition: Field['condition'], answers: Record<string, Answer>) {
  if (!condition) return true
  const value = answers[condition.field_id]
  if (condition.operator === 'ANSWERED') return answerPresent(value)
  const actual = value?.text?.trim() ? [value.text.trim()] : value?.values?.map(choice => choice.trim()) || []
  const matches = actual.some(choice => condition.values?.includes(choice))
  return condition.operator === 'NOT_EQUALS' || condition.operator === 'NOT_IN' ? !matches : matches
}

export function visibleAssessmentFields(record: RequestRecord, answers: Record<string, Answer>): Field[] {
  const sections = new Map(record.sections?.map(section => [section.id, section.condition]))
  return record.fields.filter(field => conditionMatches(sections.get(field.section_id || ''), answers) && conditionMatches(field.condition, answers))
}

export function updateAssessmentAnswer(record: RequestRecord, answers: Record<string, Answer>, fieldId: string, answer: Answer) {
  let next = { ...answers, [fieldId]: answer }
  // Dependencies are ordered in the pinned contract. Remove hidden values so
  // a downstream question cannot stay visible because of a stale answer.
  for (const field of record.fields) {
    if (!(field.id in next)) continue
    const section = record.sections?.find(item => item.id === field.section_id)
    if (!conditionMatches(section?.condition, next) || !conditionMatches(field.condition, next)) {
      const { [field.id]: _, ...visible } = next
      next = visible
    }
  }
  return next
}

export function assessmentReviewFor(record: RequestRecord, reviews: AssessmentReviewReceipt[]) {
  return reviews.find(review => review.request_id === record.id && review.submission_id === record.latest_assessment_submission_id)
}

export function assessmentHref(programId: string, requestId: string) {
  return '/?' + new URLSearchParams({ screen: 'programs', program: programId, tab: 'assessment', request: requestId })
}

export function reviewGroupId(field: Field) {
  return field.section_id || 'all'
}
