import { test } from 'node:test'
import assert from 'node:assert/strict'
const {isAssignedAssessment}=await import('../src/features/assessments/assignedAssessmentModel.ts')

test('only an open Program request for the exact actor, scope and selected form can be opened',()=>{
  const scope={tenantId:'tenant',legalEntityId:'entity',actorId:'respondent',formId:'form'}
  const request={id:'request',tenant_id:'tenant',legal_entity_id:'entity',subject_type:'PROGRAM',subject_id:'program',status:'READY',form_template_id:'form',recipient:{principal_id:'respondent'}}
  assert.equal(isAssignedAssessment(request,scope),true)
  for(const change of [{tenant_id:'other'},{legal_entity_id:'other'},{subject_type:'VENDOR'},{subject_id:''},{status:'SUBMITTED'},{form_template_id:'other'},{recipient:{principal_id:'other'}}])assert.equal(isAssignedAssessment({...request,...change},scope),false)
})
