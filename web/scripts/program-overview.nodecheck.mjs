import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchProgramOverview, isOverview } from '../src/features/programs/programOverview.ts'

const id='00000000-0000-4000-8000-000000000301'
const measure={assessed:3,eligible:4,unknown:1,excluded:2,quality:'partial',generated_at:'2026-10-20T06:00:00Z'}
const base={program_id:id,program_revision:'7',assessment_coverage:measure,
  supported:null,open_gaps:null,evidence_to_review:null}

test('Overview validates exactly the four approved slots without inferred scores',()=>{
 assert.equal(isOverview(base,id),true)
 assert.equal(isOverview({...base,assessment_coverage:null},id),true)
 for(const invalid of [
  {...base,program_id:'different'},
  {...base,supported:99},
  {...base,open_gaps:0},
  {...base,evidence_to_review:1},
  {...base,assessment_coverage:{...measure,assessed:5}},
  {...base,assessment_coverage:{...measure,quality:'final'}},
  {...base,assessment_coverage:{...measure,generated_at:'invalid'}},
 ]){
  assert.equal(isOverview(invalid,id),false)
 }
})

test('Overview is same-origin signed-session read with source revision protection',async()=>{
 const original=globalThis.fetch
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,'/api/v1/programs/'+id+'/overview')
   assert.equal(options.method,'GET')
   assert.equal(options.cache,'no-store')
   assert.equal(options.credentials,'same-origin')
   assert.deepEqual(options.headers,{Accept:'application/json'})
   return {status:200,ok:true,json:async()=>base}
  }
  assert.deepEqual(await fetchProgramOverview(id,'7',new AbortController().signal),{
   status:'ready',overview:base,
  })
  assert.deepEqual(await fetchProgramOverview(id,'8',new AbortController().signal),{status:'changed'})
  for(const [status,want] of [[401,'unauthenticated'],[403,'forbidden'],
    [404,'not_found'],[503,'unavailable']]){
   globalThis.fetch=async()=>({status,ok:false})
   assert.deepEqual(await fetchProgramOverview(id,'7',new AbortController().signal),{status:want})
  }
  assert.deepEqual(await fetchProgramOverview('bad','7',new AbortController().signal),{status:'unavailable'})
 }finally{globalThis.fetch=original}
})
