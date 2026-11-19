import assert from 'node:assert/strict'
import test from 'node:test'
import { assessmentReviewFor, attachmentIds, updateAssessmentAnswer, visibleAssessmentFields } from '../src/features/programs/assessmentResponseModel.ts'
import { assessmentStatusLabel, documentStatusLabel } from '../src/features/programs/reviewStatus.ts'

test('a resubmission has its own review status', () => {
  const record = { id: 'assessment', status: 'SUBMITTED', latest_assessment_submission_id: 'revision-2', latest_assessment_revision: 2 }
  const original = { request_id: 'assessment', submission_id: 'revision-1', status: 'FOLLOW_UP_REQUIRED' }
  assert.equal(assessmentReviewFor(record, [original]), undefined)
  assert.equal(assessmentStatusLabel(record.status, assessmentReviewFor(record, [original]), record.latest_assessment_revision), 'Resubmitted')
  const corrected = { ...original, submission_id: 'revision-2', status: 'REVIEWED' }
  assert.equal(assessmentStatusLabel(record.status, assessmentReviewFor(record, [original, corrected]), record.latest_assessment_revision), 'Reviewed')
})

test('document status uses its exact question and submission before the older group decision', () => {
  const review = {
    request_id: 'assessment', submission_id: 'revision-1', groups: [{
      group_id: 'access', outcome: 'FOLLOW_UP_REQUIRED', artifact_ids: ['retained-file', 'original-file'],
      questions: [{ field_id: 'control', outcome: 'REVIEWED', artifact_ids: ['retained-file'] }],
    }],
  }
  const reference = { request_id: 'assessment', submission_id: 'revision-1' }
  assert.equal(documentStatusLabel({ ...reference, field_id: 'control', artifact_id: 'retained-file' }, [review]), 'Reviewed')
  assert.equal(documentStatusLabel({ ...reference, field_id: 'access', artifact_id: 'original-file' }, [review]), 'Follow-up required')
  assert.equal(documentStatusLabel({ ...reference, submission_id: 'revision-2', field_id: 'control', artifact_id: 'retained-file' }, [review]), 'Submitted')
})

test('changing an earlier answer removes newly hidden draft evidence and dependent answers', () => {
  const record = {
    sections: [{ id: 'vendor', condition: { field_id: 'enabled', operator: 'EQUALS', values: ['Yes'] } }],
    fields: [
      { id: 'enabled' },
      { id: 'exception', section_id: 'vendor' },
      { id: 'proof', type: 'file', condition: { field_id: 'exception', operator: 'ANSWERED' } },
    ],
  }
  const initial = { enabled: { text: 'Yes' }, exception: { text: 'Approved owner' }, proof: { artifact_ids: ['file-id'] } }
  assert.deepEqual(visibleAssessmentFields(record, initial).map(field => field.id), ['enabled', 'exception', 'proof'])
  const revised = updateAssessmentAnswer(record, initial, 'enabled', { text: 'No' })
  assert.deepEqual(revised, { enabled: { text: 'No' } })
  assert.deepEqual(attachmentIds(record.fields[2], initial.proof), ['file-id'])
})
