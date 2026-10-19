import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchApprovedRequirements } from '../src/features/programs/approvedRequirements.ts'

const id='00000000-0000-4000-8000-000000000301'
const rid='00000000-0000-4000-8000-000000000401'
const item={id:rid,code:'A-1',title:'Approved source reference',version:1,effective_from:'2026-10-19T12:00:00Z'}
const page={program_id:id,program_revision:'7',items:[item],next_cursor:'opaque'}

test('reads only authorized source reference metadata with bounded pagination',async()=>{
 const original=globalThis.fetch
 try {
  globalThis.fetch=async(url,init)=>{
   assert.equal(url,'/api/v1/programs/'+id+'/requirements?limit=25&cursor=opaque')
   assert.equal(init.method,'GET')
   assert.equal(init.credentials,'same-origin')
   assert.equal(init.cache,'no-store')
   assert.deepEqual(init.headers,{Accept:'application/json'})
   assert.ok(init.signal instanceof AbortSignal)
   return {status:200,ok:true,json:async()=>page}
  }
  assert.deepEqual(await fetchApprovedRequirements(id,'7','opaque',new AbortController().signal),{status:'ready',page})
 }finally{globalThis.fetch=original}
})

test('denied, absent and unavailable remain distinct',async()=>{
 const original=globalThis.fetch
 try{
  for(const [code,status] of [[401,'unauthenticated'],[403,'forbidden'],[404,'not_found'],[409,'unavailable'],[503,'unavailable']]){
   globalThis.fetch=async()=>({status:code,ok:false})
   assert.deepEqual(await fetchApprovedRequirements(id,'7','',new AbortController().signal),{status})
  }
  globalThis.fetch=async()=>{throw new Error('offline')}
  assert.deepEqual(await fetchApprovedRequirements(id,'7','',new AbortController().signal),{status:'unavailable'})
 }finally{globalThis.fetch=original}
})

test('rejects cross-program, changed revision and malformed source records',async()=>{
 const original=globalThis.fetch
 try{
  for(const payload of [
   {...page,program_id:'00000000-0000-4000-8000-000000000302'},
   {...page,items:[item,item]},
   {...page,items:[{...item,id:'not-a-uuid'}]},
   {...page,items:[{...item,version:0}]},
   {...page,items:[{...item,effective_from:'invalid'}]},
   {...page,next_cursor:'x'.repeat(257)},
   {...page,items:Array(26).fill(item)},
  ]){
   globalThis.fetch=async()=>({status:200,ok:true,json:async()=>payload})
   assert.deepEqual(await fetchApprovedRequirements(id,'7','',new AbortController().signal),{status:'unavailable'})
  }
  globalThis.fetch=async()=>({status:200,ok:true,json:async()=>({...page,program_revision:'8'})})
  assert.deepEqual(await fetchApprovedRequirements(id,'7','',new AbortController().signal),{status:'changed'})
  assert.deepEqual(await fetchApprovedRequirements('invalid','7','',new AbortController().signal),{status:'unavailable'})
 }finally{globalThis.fetch=original}
})
