import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchProgramIssues, validIssuePage } from '../src/features/programs/programIssues.ts'

const id='00000000-0000-4000-8000-000000000301'
const issue={id:'00000000-0000-4000-8000-000000000911',
 reference:'ISSUE-1',title:'Visible issue',type:'CONTROL_GAP',
 status:'TRIAGE',priority:3,updated_at:'2026-10-20T06:00:00Z'}
const page={program_id:id,program_revision:'7',items:[issue],next_cursor:'opaque'}

test('Issues list validates identity, current status and bounded page',()=>{
 assert.equal(validIssuePage(page,id),true)
 for(const candidate of [
  {...page,program_id:'different'},
  {...page,items:[issue,issue]},
  {...page,items:[{...issue,status:'CLOSED'}]},
  {...page,items:[{...issue,priority:8}]},
  {...page,items:[{...issue,title:''}]},
  {...page,items:[{...issue,id:'invalid'}]},
  {...page,next_cursor:'x'.repeat(257)},
 ]){
  assert.equal(validIssuePage(candidate,id),false)
 }
})

test('Issues read stays on signed same-origin Program scope and revision',async()=>{
 const original=globalThis.fetch
 try{
  globalThis.fetch=async(url,opts)=>{
   assert.equal(url,'/api/v1/programs/'+id+'/issues?limit=25&cursor=opaque')
   assert.equal(opts.credentials,'same-origin')
   assert.equal(opts.cache,'no-store')
   assert.deepEqual(opts.headers,{Accept:'application/json'})
   return {status:200,ok:true,json:async()=>page}
  }
  assert.deepEqual(await fetchProgramIssues(id,'7','opaque',new AbortController().signal),
   {status:'ready',page})
  assert.deepEqual(await fetchProgramIssues(id,'8','opaque',new AbortController().signal),
   {status:'changed'})
  for(const [status,want] of [[401,'unauthenticated'],[403,'forbidden'],
    [404,'not_found'],[503,'unavailable']]){
    globalThis.fetch=async()=>({status,ok:false})
    assert.deepEqual(await fetchProgramIssues(id,'7','',new AbortController().signal),{status:want})
  }
 }finally{globalThis.fetch=original}
})
