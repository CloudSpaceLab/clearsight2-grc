import { isSupportingDocumentRequest, latestRequests, programRequests } from './v1Client.ts'
import type { AssessmentWorkspace, RequestRecord, RequirementReview } from './v1Client.ts'

export function validOverviewWorkspace(value: AssessmentWorkspace, programId: string) {
  return !!value && ['assessment_count', 'responses_to_review', 'documents_to_review'].every(key => Number.isSafeInteger(value[key as keyof AssessmentWorkspace]) && Number(value[key as keyof AssessmentWorkspace]) >= 0) &&
    Array.isArray(value.items) && value.items.every(r => r.subject_type === 'PROGRAM' && r.subject_id === programId && typeof r.id === 'string' && Number.isFinite(Date.parse(r.updated_at))) &&
    (value.requirement_reviews === undefined || Array.isArray(value.requirement_reviews) && value.requirement_reviews.every(r => typeof r.id === 'string' && typeof r.area === 'string' && ['REVIEWED', 'FOLLOW_UP_REQUIRED', 'UNASSESSED'].includes(r.outcome)))
}

export function recentAssessments(items: RequestRecord[], programId: string, days: number, now = Date.now()) {
  const cutoff = now - days * 86400000
  return latestRequests(programRequests(items, programId).filter(r => !isSupportingDocumentRequest(r) && Date.parse(r.updated_at) >= cutoff)).slice(0, 4)
}
export function reviewDistribution(items: RequirementReview[]) {
  return { reviewed: items.filter(r => r.outcome === 'REVIEWED').length,
    followUp: items.filter(r => r.outcome === 'FOLLOW_UP_REQUIRED').length,
    unassessed: items.filter(r => r.outcome === 'UNASSESSED').length, total: items.length }
}
export function areaReviews(items: RequirementReview[]) {
  return [...new Set(items.map(r => r.area))].map(area => ({ area, items: items.filter(r => r.area === area), ...reviewDistribution(items.filter(r => r.area === area)) }))
}
