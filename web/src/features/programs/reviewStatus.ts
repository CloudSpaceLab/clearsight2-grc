import type { AssessmentReviewReceipt } from './assessmentResponseModel'

export const statusLabel = (status: string) => ({
  DRAFT: 'Draft', OPEN: 'Draft', READY: 'Draft', SUBMITTED: 'Submitted',
  IN_PROGRESS: 'Draft', EXPIRED: 'Expired', RESPONSE_RESUBMITTED: 'Response resubmitted',
  CHANGES_REQUESTED: 'Changes requested', REVIEWED: 'Reviewed', APPROVED: 'Reviewed',
}[status] || status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))

export const reviewStatusTone: Record<string, string> = {
  Draft: 'closed',
  Submitted: 'review',
  Resubmitted: 'review',
  Expired: 'closed',
  'Changes requested': 'incomplete',
  'Follow-up required': 'incomplete',
  Reviewed: 'received',
}

export function assessmentStatusLabel(status: string, review?: Pick<AssessmentReviewReceipt, 'status'>, revision?: number) {
  if (status === 'SUBMITTED' && review?.status === 'FOLLOW_UP_REQUIRED') return 'Changes requested'
  if (status === 'SUBMITTED' && review?.status === 'REVIEWED') return 'Reviewed'
  if (status === 'SUBMITTED' && revision && revision > 1) return 'Resubmitted'
  return statusLabel(status)
}

export function documentStatusLabel(document: {
  request_id: string
  submission_id: string
  artifact_id: string
  field_id?: string
  review?: { status: string }
}, reviews: AssessmentReviewReceipt[]) {
  const latest = reviews.find(review => review.request_id === document.request_id && review.submission_id === document.submission_id)
  const questions = latest?.groups.flatMap(group => group.questions || [])
  const question = questions?.find(item => item.field_id === document.field_id && item.artifact_ids?.includes(document.artifact_id))
  if (question) return question.outcome === 'REVIEWED' ? 'Reviewed' : 'Follow-up required'
  const groups = latest?.groups.filter(group => group.artifact_ids?.includes(document.artifact_id))
  if (groups?.some(group => group.outcome === 'FOLLOW_UP_REQUIRED')) return 'Follow-up required'
  if (groups?.some(group => group.outcome === 'REVIEWED') || document.review?.status === 'VALIDATED') return 'Reviewed'
  if (document.review?.status === 'REJECTED') return 'Follow-up required'
  return document.review ? statusLabel(document.review.status) : 'Submitted'
}
