export type ActivityCategory = '' | 'PROGRAM' | 'ISSUE' | 'ASSESSMENT' | 'DOCUMENT' | 'SCHEDULE'
export type ActivityFilters = { search: string; category: ActivityCategory; event_type?: string; from: string; to: string }
export type ProgramActivityEvent = {
  id: string; category: Exclude<ActivityCategory, ''>; record_id: string; request_id?: string;
  submission_id?: string; artifact_id?: string; field_id?: string; title: string; event: string;
  actor?: string; actor_name: string; at: string; details: Record<string, unknown>;
}
export type ActivityPage = { items: ProgramActivityEvent[]; next_cursor?: string; through: string }
export const activityCategories = { PROGRAM: 'Program', ISSUE: 'Issues and verification', ASSESSMENT: 'Assessments', DOCUMENT: 'Documents', SCHEDULE: 'Schedules' } as const
export const activityEventTypes = [
  'ASSESSMENT_CREATED', 'RESPONSE_SUBMITTED', 'RESPONSE_RESUBMITTED', 'REVIEWED', 'FOLLOW_UP_REQUIRED',
  'DOCUMENT_REQUEST_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SUBMITTED', 'DOCUMENT_REVIEWED', 'DOCUMENT_FOLLOW_UP_REQUIRED',
  'ProgramAssessmentScheduleProposed', 'ProgramAssessmentScheduleApproved', 'ProgramAssessmentScheduleStopped', 'ProgramAssessmentScheduleCycleProcessed',
  'PROGRAM_CREATED', 'PROGRAM_STATUS_CHANGED', 'PROGRAM_DETAILS_UPDATED', 'PROGRAM_OWNER_CHANGED', 'PROGRAM_APPROVAL_AUTHORITY_CHANGED', 'PROGRAM_STATE_UPDATED', 'PROGRAM_REVIEW_ACCEPTED',
  'QUESTIONNAIRE_LINKED', 'QUESTIONNAIRE_UNLINKED', 'REQUIREMENT_ADDED', 'REQUIREMENT_SUPERSEDED', 'REQUIREMENT_REVIEW_PROPOSED', 'REQUIREMENT_REVIEW_APPROVED', 'REQUIREMENT_REVIEW_REJECTED',
  'MATTER_CREATED', 'MATTER_LINKED', 'MATTER_STATE_CHANGED', 'MATTER_DETAILS_UPDATED', 'MATTER_OWNER_CHANGED', 'ACTION_ADDED', 'ACTION_STATE_CHANGED', 'VERIFICATION_CONTRACT_ADDED', 'VERIFICATION_RESULT_RECORDED',
]
export function activityLabel(event: string) {
  return event.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').toLowerCase()
    .replace(/^matter\b/, 'issue').replace(/^program assessment schedule /, 'Schedule ')
    .replace(/^./, text => text.toUpperCase())
}
export function activityPath(program: string, filters: ActivityFilters, cursor = '', limit = 25) {
  const query = new URLSearchParams({ ...filters, limit: String(limit) })
  if (cursor) query.set('cursor', cursor)
  return `/api/v1/programs/${encodeURIComponent(program)}/activity?${query}`
}
export function validActivityDates(filters: ActivityFilters) { return !filters.from || !filters.to || filters.from <= filters.to }
export async function loadActivityExport(program: string, filters: ActivityFilters, load: (path: string) => Promise<ActivityPage>, active: () => boolean) {
  const items: ProgramActivityEvent[] = [], seen = new Set<string>()
  let cursor = '', through = ''
  do {
    const page = await load(activityPath(program, filters, cursor, 100))
    if (!active()) return null
    if (through && through !== page.through) throw Error('History changed during export. Refresh and try again.')
    through = page.through; items.push(...page.items); cursor = page.next_cursor || ''
    if (cursor && (seen.has(cursor) || items.length >= 20000)) throw Error('The history export is too large or could not advance. Narrow the filters and try again.')
    seen.add(cursor)
  } while (cursor)
  return { items, through }
}
export function activityRecordTarget(item: ProgramActivityEvent) {
  if (item.category === 'ISSUE') return { section: 'Issues', issueId: item.record_id } as const
  if (item.category === 'SCHEDULE') return { section: 'Assessment', schedules: true, scheduleId: item.record_id } as const
  if (item.category === 'DOCUMENT' && item.details?.request_kind === 'DOCUMENT_REQUEST') return { section: 'Documents', requestId: item.request_id } as const
  if (item.request_id) return { section: 'Assessment', requestId: item.request_id, submissionId: item.submission_id } as const
  return { section: 'Overview' } as const
}
