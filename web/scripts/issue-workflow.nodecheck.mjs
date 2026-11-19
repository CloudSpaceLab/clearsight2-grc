import {test} from 'node:test'
import assert from 'node:assert/strict'
import {evidenceReferences,filterIssues,isIssueOverdue,issueCommandBase,issueStateLabel,verificationBlocker,verifyIssueScope} from '../src/features/programs/issueModel.ts'

const matter={id:'issue',tenant_id:'tenant',legal_entity_id:'entity',title:'Access finding',summary:'Revoke supplier grant',reference:'ISS-1',status:'VERIFICATION',priority:2,version:4,owner_principal_id:'owner',due_at:'2026-11-01T23:59:59Z'}
const record={matter,links:[{program_id:'program'}],actions:[{id:'action',owner_principal_id:'performer',status:'IMPLEMENTED',implemented_at:'2026-11-18T10:00:00Z'}],verification_contracts:[],verification_results:[],closure:{ready:false,reasons:['Missing outcome']}}
const operations={matter_id:'issue',matter_version:4,authority_available:true,operations:[{command:'matter.transition',can_act:true,allowed_targets:['CLOSED']},{command:'matter.outcome.record',subresource_id:'check',can_act:true}]}
test('filters real lifecycle states, ownership and overdue population without treating closed issues as overdue',()=>{
 const rows=[record,{matter:{...matter,id:'draft',status:'DRAFT',owner_principal_id:''}}, {matter:{...matter,id:'closed',status:'CLOSED'}}]
 assert.equal(filterIssues(rows,'supplier','','','owner').length,3)
 assert.equal(filterIssues(rows,'','DRAFT','','owner')[0].matter.id,'draft')
 assert.equal(filterIssues(rows,'','','unassigned','owner')[0].matter.id,'draft')
 assert.equal(filterIssues(rows,'','','mine','owner').length,2)
 assert.equal(isIssueOverdue(matter,Date.parse('2026-11-18')),true)
 assert.equal(isIssueOverdue({...matter,status:'CLOSED'},Date.parse('2026-11-18')),false)
 assert.equal(isIssueOverdue({...matter,due_at:'0001-01-01T00:00:00Z'}),false)
 assert.equal(issueStateLabel('TRIAGE'),'Triage')
 assert.equal(issueStateLabel('VERIFICATION'),'Verification')
})
test('scope checks reject foreign tenant/entity, retired Program links and malformed versions',()=>{
 assert.equal(verifyIssueScope(record,'program','tenant','entity'),record)
 for(const [p,t,e] of [['other','tenant','entity'],['program','other','entity'],['program','tenant','other']])assert.throws(()=>verifyIssueScope(record,p,t,e))
 assert.throws(()=>verifyIssueScope({...record,links:[{program_id:'program',retired_at:'2026-01-01'}]},'program','tenant','entity'))
 assert.throws(()=>verifyIssueScope({...record,matter:{...matter,version:0}},'program','tenant','entity'))
})
test('commands recheck version, exact operation target, authority and closure readiness',()=>{
 assert.throws(()=>issueCommandBase(record,record,operations,'matter.transition',undefined,'CLOSED'),/Closure/)
 const ready={...record,closure:{ready:true,reasons:[]}}
 assert.deepEqual(issueCommandBase(ready,ready,operations,'matter.transition',undefined,'CLOSED'),{tenant_id:'tenant',expected_version:4})
 assert.throws(()=>issueCommandBase(ready,{...ready,matter:{...matter,version:5}},operations,'matter.transition',undefined,'CLOSED'),/changed/)
 assert.throws(()=>issueCommandBase(ready,ready,{...operations,authority_available:false},'matter.transition',undefined,'CLOSED'),/responsibility/)
 assert.throws(()=>issueCommandBase(ready,ready,operations,'matter.transition',undefined,'CANCELLED'),/responsibility/)
 assert.throws(()=>issueCommandBase(ready,ready,operations,'matter.outcome.record','other'),/responsibility/)
 assert.deepEqual(issueCommandBase(record,record,operations,'matter.outcome.record','check'),{tenant_id:'tenant',expected_version:4})
})
const check={id:'check',status:'ACTIVE',action_id:'action',created_at:'2026-11-18T09:00:00Z',observation_period_minutes:60}
test('independent verification blocks the action owner, unfinished work and observation periods',()=>{
 const before=Date.parse('2026-11-18T10:59:59Z'),after=Date.parse('2026-11-18T11:00:00Z')
 assert.match(verificationBlocker(record,check,'performer',after),/independent/)
 assert.match(verificationBlocker(record,check,'reviewer',before),/observation/)
 assert.equal(verificationBlocker(record,check,'reviewer',after),'')
 assert.match(verificationBlocker({...record,actions:[{...record.actions[0],status:'IN_PROGRESS'}]},check,'reviewer',after),/implemented/)
 assert.match(verificationBlocker(record,{...check,status:'RETIRED'},'reviewer',after),/active/)
 assert.match(verificationBlocker(record,{...check,created_at:'invalid'},'reviewer',after),/confirmed/)
})
test('evidence references retain concrete record identifiers without duplicate or empty entries',()=>{
 assert.deepEqual(evidenceReferences(' record-1\n\r\nrecord-2\nrecord-1 '),['record-1','record-2'])
 assert.deepEqual(evidenceReferences(' \n '),[])
})
