import assert from 'node:assert/strict'
import test from 'node:test'
import { activityLabel, activityPath, activityRecordTarget, validActivityDates } from '../src/features/programs/programActivityModel.ts'
const filters = { search: 'Chief Risk Officer & review', category: 'DOCUMENT', from: '2026-11-01', to: '2026-11-30' }
test('Activity requests preserve filters and opaque cursor on subsequent server pages', () => {
 const url=new URL(activityPath('program',filters,'scoped+cursor/=',100),'http://localhost')
 assert.equal(url.pathname,'/api/v1/programs/program/activity')
 for (const [key,value] of Object.entries(filters)) assert.equal(url.searchParams.get(key),value)
 assert.equal(url.searchParams.get('cursor'),'scoped+cursor/=');assert.equal(url.searchParams.get('limit'),'100')
})
test('Activity links preserve exact issue, schedule and immutable response identity', () => {
 const base={record_id:'record',request_id:'request',submission_id:'revision-1'}
 assert.deepEqual(activityRecordTarget({...base,category:'ISSUE'}),{section:'Issues',issueId:'record'})
 assert.deepEqual(activityRecordTarget({...base,category:'SCHEDULE'}),{section:'Assessment',schedules:true,scheduleId:'record'})
 assert.deepEqual(activityRecordTarget({...base,category:'DOCUMENT'}),{section:'Assessment',requestId:'request',submissionId:'revision-1'})
 assert.deepEqual(activityRecordTarget({category:'PROGRAM'}),{section:'Overview'})
})
test('Activity labels translate stored codes and schedule events without changing evidence meaning',()=>{
 assert.equal(activityLabel('ProgramAssessmentScheduleCycleProcessed'),'Schedule cycle processed')
 assert.equal(activityLabel('MATTER_STATE_CHANGED'),'Issue state changed')
 assert.equal(activityLabel('DOCUMENT_FOLLOW_UP_REQUIRED'),'Document follow up required')
 assert.equal(validActivityDates({...filters,from:'2026-12-01'}),false)
 assert.equal(validActivityDates(filters),true)
})

test('Export traverses all server pages, preserving one snapshot and filters',async()=>{
 const {loadActivityExport}=await import('../src/features/programs/programActivityModel.ts')
 const requests=[]
 const result=await loadActivityExport('program',filters,async path=>{
  const q=new URL(path,'http://localhost').searchParams;requests.push(q)
  return q.has('cursor')?{items:[{id:'second'}],through:'snapshot'}:{items:[{id:'first'}],next_cursor:'older',through:'snapshot'}
 },()=>true)
 assert.deepEqual(result,{items:[{id:'first'},{id:'second'}],through:'snapshot'})
 assert.equal(requests.length,2);assert.equal(requests[1].get('category'),'DOCUMENT');assert.equal(requests[1].get('cursor'),'older')
})
test('Failed or stale exports never return a partial success',async()=>{
 const {loadActivityExport}=await import('../src/features/programs/programActivityModel.ts')
 assert.equal(await loadActivityExport('program',filters,async()=>({items:[],through:'snapshot'}),()=>false),null)
 let calls=0
 await assert.rejects(loadActivityExport('program',filters,async()=>{if(calls++)throw Error('service unavailable');return{items:[{id:'first'}],through:'snapshot',next_cursor:'older'}},()=>true),/service unavailable/)
 await assert.rejects(loadActivityExport('program',filters,async()=>({items:[],through:'snapshot',next_cursor:'same'}),()=>true),/could not advance/)
})
