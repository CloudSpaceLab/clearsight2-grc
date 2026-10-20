import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchProgram, isProgramRecord, readProgramId } from '../src/features/programs/programRecord.ts'

const ID = '00000000-0000-4000-8000-000000000301'
const other = '00000000-0000-4000-8000-000000000302'
const record = { id: ID, name: 'Authorized Program', code: 'SEC-001', status: 'ACTIVE', program_type: 'REGULATORY', owning_function: 'SECURITY', jurisdiction: 'NG', source_revision: '7', updated_at: '2026-10-19T14:00:00Z' }

test('selects only exactly one valid Program UUID in Program screen', () => {
  assert.equal(readProgramId('?screen=programs&program='+ID), ID)
  for (const query of [
    '?screen=frameworks&program='+ID, '?screen=programs&program=not-a-uuid',
    '?screen=programs&program='+ID+'&program='+other, '?screen=programs',
  ]) assert.equal(readProgramId(query), null)
})

test('rejects cross-record and incomplete response bodies', () => {
  assert.ok(isProgramRecord(record, ID))
  assert.equal(isProgramRecord({...record, id:other},ID),false)
  assert.equal(isProgramRecord({...record, source_revision:''},ID),false)
  assert.equal(isProgramRecord({...record, updated_at:'garbage'},ID),false)
  assert.equal(isProgramRecord({...record, name:' '},ID),false)
  assert.equal(isProgramRecord({...record, code:''},ID),false)
  assert.equal(isProgramRecord({...record, status:'COMPLIANT'},ID),false)
  assert.equal(isProgramRecord({...record, owning_function:''},ID),false)
  assert.equal(isProgramRecord({...record, program_type:''},ID),false)
})

test('preserves HTTP denial states and never adds client auth headers', async () => {
  const saved = globalThis.fetch
  try {
    for (const [code, status] of [[401,'unauthenticated'],[403,'forbidden'],[404,'not_found'],[503,'unavailable']]) {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, '/api/v1/programs/'+ID)
        assert.equal(init.credentials,'same-origin')
        assert.equal(init.cache,'no-store')
        assert.deepEqual(init.headers,{Accept:'application/json'})
        return {status:code, ok:false}
      }
      assert.deepEqual(await fetchProgram(ID,new AbortController().signal),{status})
    }
    globalThis.fetch=async ()=>({status:200,ok:true,json:async()=>({...record,id:other})})
    assert.deepEqual(await fetchProgram(ID,new AbortController().signal),{status:'unavailable'})
    globalThis.fetch=async ()=>({status:200,ok:true,json:async()=>record})
    assert.deepEqual(await fetchProgram(ID,new AbortController().signal),{status:'ready',record})
    globalThis.fetch=async ()=>{throw new Error('offline')}
    assert.deepEqual(await fetchProgram(ID,new AbortController().signal),{status:'unavailable'})
  } finally {
    globalThis.fetch = saved
  }
})

import { fetchProgramPage, isProgramPage } from '../src/features/programs/programDirectory.ts'

test('Program discovery response rejects malformed, oversized and duplicate records', () => {
  assert.ok(isProgramPage({items:[record]}))
  assert.ok(isProgramPage({items:[]}))
  assert.equal(isProgramPage({items:[record,record]}),false)
  assert.equal(isProgramPage({items:[{...record,source_revision:''}]}),false)
  assert.equal(isProgramPage({items:[{...record,id:'test'}]}),false)
  assert.equal(isProgramPage({items:[record],next_cursor:1}),false)
  assert.equal(isProgramPage({items:[record],next_cursor:'a'.repeat(257)}),false)
})

test('Program discovery retains same-origin security and distinguishes sign-in/denial/outage',async()=>{
  const original=globalThis.fetch
  try{
    for(const [status,expected] of [[401,'unauthenticated'],[403,'forbidden'],[404,'unavailable'],[500,'unavailable']]){
      globalThis.fetch=async(url,init)=>{
        assert.equal(url,'/api/v1/programs?limit=25')
        assert.equal(init.credentials,'same-origin')
        assert.equal(init.cache,'no-store')
        assert.deepEqual(init.headers,{Accept:'application/json'})
        return {status,ok:false}
      }
      assert.deepEqual(await fetchProgramPage('',new AbortController().signal),{status:expected})
    }
    globalThis.fetch=async(url)=>{
      assert.equal(url,'/api/v1/programs?limit=25&cursor=opaque')
      return {status:200,ok:true,json:async()=>({items:[record],next_cursor:'next'})}
    }
    assert.deepEqual(await fetchProgramPage('opaque',new AbortController().signal),
      {status:'ready',items:[record],nextCursor:'next'})
    globalThis.fetch=async()=>({status:200,ok:true,json:async()=>({items:[{...record,id:'INVALID'}]})})
    assert.deepEqual(await fetchProgramPage('',new AbortController().signal),{status:'unavailable'})
  }finally{globalThis.fetch=original}
})


test('Program selector binds search and lifecycle without client scope overrides',async()=>{
 const saved=globalThis.fetch
 try{
  globalThis.fetch=async(url,init)=>{
   assert.equal(url,'/api/v1/programs?limit=25&cursor=opaque&q=Information+security&status=ACTIVE')
   assert.equal(init.credentials,'same-origin')
   assert.equal(init.cache,'no-store')
   assert.deepEqual(init.headers,{Accept:'application/json'})
   return {status:200,ok:true,json:async()=>({items:[record]})}
  }
  assert.deepEqual(await fetchProgramPage('opaque',new AbortController().signal,' Information security ','ACTIVE'),{
   status:'ready',items:[record],nextCursor:'',
  })
  assert.deepEqual(await fetchProgramPage('',new AbortController().signal,'x'.repeat(81),'ACTIVE'),{
   status:'unavailable',
  })
  assert.deepEqual(await fetchProgramPage('',new AbortController().signal,'','COMPLIANT'),{
   status:'unavailable',
  })
 }finally{globalThis.fetch=saved}
})
