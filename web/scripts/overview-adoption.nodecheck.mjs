import {test} from 'node:test'
import assert from 'node:assert/strict'
import {recentAssessments,reviewDistribution,areaReviews,validOverviewWorkspace} from '../src/features/programs/overviewModel.ts'
import {settingsCommand} from '../src/features/programs/programSettingsModel.ts'

test('period filters recent activity, excludes standalone documents and preserves Program scope',()=>{
 const now=Date.parse('2026-11-18T12:00:00Z')
 const request=(id,days,extra={})=>({id,subject_type:'PROGRAM',subject_id:'program',updated_at:new Date(now-days*86400000).toISOString(),purpose:'Assessment',...extra})
 const items=[request('old',31),request('week',7),request('recent',1),request('other',0,{subject_id:'other'}),request('document',0,{purpose:'Supporting documentation for the selected Program'})]
 assert.deepEqual(recentAssessments(items,'program',7,now).map(r=>r.id),['recent','week'])
 assert.deepEqual(recentAssessments(items,'program',30,now).map(r=>r.id),['recent','week'])
 assert.equal(recentAssessments(items,'program',90,now).length,3)
 assert.equal(items.length,5)
})
test('segmented evidence counts reconcile without implying compliance or losing follow-up',()=>{
 const rows=[{id:'1',area:'Access',outcome:'FOLLOW_UP_REQUIRED'},{id:'2',area:'Access',outcome:'REVIEWED'},{id:'3',area:'Risk',outcome:'UNASSESSED'}]
 assert.deepEqual(reviewDistribution(rows),{reviewed:1,followUp:1,unassessed:1,total:3})
 assert.deepEqual(areaReviews(rows).map(a=>[a.area,a.total,a.followUp,a.unassessed]),[['Access',2,1,0],['Risk',1,0,1]])
 assert.deepEqual(reviewDistribution([]),{reviewed:0,followUp:0,unassessed:0,total:0})
})
const snapshot={aggregate:{program:{id:'p',tenant_id:'t',version:3,scope:{business_lines:['Retail']},effective_from:'2026-01-01T00:00:00Z',effective_until:'2027-01-01T00:00:00Z'}},operations:{authority_available:true,operations:[{command:'program.details.update',can_act:true}]}}
const fields={name:' Security ',function:' Information Security ',jurisdiction:' Nigeria ',rationale:'Correct the approved Program name.'}
test('settings command preserves scope/effective dates and sends no client actor or owner assignment',()=>{
 const body=settingsCommand(snapshot,snapshot,fields)
 assert.equal(body.name,'Security');assert.equal(body.expected_version,3)
 assert.deepEqual(body.scope,snapshot.aggregate.program.scope)
 assert.equal(body.effective_until,'2027-01-01T00:00:00Z')
 assert.equal(body.actor_id,undefined);assert.equal(body.owner_principal_id,undefined)
})
test('settings fail closed for stale versions, revoked authority and blank rationale',()=>{
 assert.throws(()=>settingsCommand(snapshot,{...snapshot,aggregate:{program:{...snapshot.aggregate.program,version:4}}},fields),/changed/)
 assert.throws(()=>settingsCommand(snapshot,{...snapshot,operations:{...snapshot.operations,authority_available:false}},fields),/permission/)
 assert.throws(()=>settingsCommand(snapshot,{...snapshot,operations:{...snapshot.operations,operations:[]}},fields),/permission/)
 assert.throws(()=>settingsCommand(snapshot,snapshot,{...fields,rationale:' '}),/Enter/)
})
test('Overview preserves unknown review data and rejects negative counts or foreign records',()=>{
 const workspace={assessment_count:0,responses_to_review:0,documents_to_review:0,items:[]}
 assert.equal(validOverviewWorkspace(workspace,'p'),true)
 assert.equal(validOverviewWorkspace({...workspace,documents_to_review:null},'p'),false)
 assert.equal(validOverviewWorkspace({...workspace,assessment_count:-1},'p'),false)
 assert.equal(validOverviewWorkspace({...workspace,items:[{id:'r',subject_type:'PROGRAM',subject_id:'other',updated_at:'2026-11-18T12:00:00Z'}]},'p'),false)
 assert.equal(validOverviewWorkspace({...workspace,requirement_reviews:[{id:'r',area:'Access',outcome:'COMPLIANT'}]},'p'),false)
})
