import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { command, scoped, V1Error } from '../src/features/programs/v1Client.ts'

// This list is the V2 client boundary, checked against V1's exact runtime schema
// in the paired CI step. It does not claim the legacy V1 UI implements these.
const operations = {
  saveProgramFrameworkAdoptionDraft: ['/standards/draft', 'frameworks/FrameworkStarterWizard.tsx', ['action===\'draft\'', '/standards', 'command<Aggregate>']],
  selectFrameworkQuestionnaire: ['/standards/{adoption_id}/questionnaire', 'frameworks/FrameworkQuestionnaire.tsx', ['/questionnaire', 'command<Linked>', 'form_template_version']],
  proposeRequirementReview: ['/requirements/{requirement_id}/review', 'programs/RequirementReviewPanel.tsx', ['/requirements/', '/review', 'program.requirement.review.propose']],
  approveRequirementReview: ['/requirement-reviews/{review_id}/approve', 'programs/RequirementReviewPanel.tsx', ['/requirement-reviews/', '/approve', 'program.requirement.review.approve']],
  rejectRequirementReview: ['/requirement-reviews/{review_id}/reject', 'programs/RequirementReviewPanel.tsx', ['/requirement-reviews/', '/reject', 'program.requirement.review.reject']],
  proposeAssessmentSchedule: ['/assessment-schedules', 'programs/AssessmentSchedules.tsx', ['/assessment-schedules', 'void save(path,', 'can_propose']],
  approveAssessmentSchedule: ['/assessment-schedules/{schedule_id}/approve', 'programs/AssessmentSchedules.tsx', ['/assessment-schedules', "action: 'approve'", 'can_approve']],
  stopAssessmentSchedule: ['/assessment-schedules/{schedule_id}/stop', 'programs/AssessmentSchedules.tsx', ['/assessment-schedules', "action: 'stop'", 'can_stop']],
  createAdoptedAssessment: ['/assessments', 'programs/AdoptedAssessmentDialog.tsx', ['/assessments', 'command<RequestRecord>', 'option?.ready']],
  reviewProgramAssessment: ['/assessment-reviews/{request_id}', 'programs/AssessmentReview.tsx', ['/assessment-reviews/', 'command', 'expected_version']],
}

test('every V2-owned Program operation retains its frontend action and permission/version context', () => {
  for (const [id, [, file, markers]] of Object.entries(operations)) {
    const source = readFileSync(new URL('../src/features/' + file, import.meta.url), 'utf8')
    for (const marker of markers) assert.ok(source.includes(marker), `${id}: missing ${marker} in ${file}`)
  }
})

test('paired V1 runtime schema agrees with the complete V2 ownership boundary', {skip: !process.env.CLEARSIGHT_V1_RUNTIME_CONTRACT}, () => {
  const contract = JSON.parse(readFileSync(process.env.CLEARSIGHT_V1_RUNTIME_CONTRACT, 'utf8'))
  const actual = {}
  for (const [path, methods] of Object.entries(contract.paths)) for (const [method, op] of Object.entries(methods)) {
    if (!op['x-clearsight-client']) continue
    assert.equal(op['x-clearsight-client'], 'clearsight2-grc')
    assert.equal(method, 'post')
    assert.equal(op['x-clearsight-route-class'], 'MATERIAL_COMMAND')
    assert.ok(operations[op.operationId], `uncovered V2 operation: ${op.operationId}`)
    assert.equal(path, '/api/v1/programs/{id}' + operations[op.operationId][0])
    actual[op.operationId] = path
  }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(operations).sort())
})

test('Program commands preserve server denial and conflict and use the same-origin session', async () => {
  const original = globalThis.fetch
  const context = {tenant:{id:'bank scope'}}
  try {
    for (const status of [403,409]) {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, '/api/v1/programs/p/assessment-schedules?tenant_id=bank%20scope')
        assert.equal(init.credentials, 'same-origin')
        assert.equal(init.method, 'POST')
        assert.equal(init.headers.has('X-Actor-ID'), false)
        assert.deepEqual(JSON.parse(init.body), {expected_version:7,rationale:'Review the selected schedule'})
        return Response.json({message:'Review is not permitted for this version'},{status})
      }
      await assert.rejects(command(scoped('/api/v1/programs/p/assessment-schedules',context),{expected_version:7,rationale:'Review the selected schedule'}), error => error instanceof V1Error && error.status===status)
    }
  } finally { globalThis.fetch=original }
})
