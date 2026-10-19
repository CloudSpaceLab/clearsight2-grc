import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchProgram, isProgramRecord, readProgramId } from '../src/features/programs/programRecord.ts'

const ID = '00000000-0000-4000-8000-000000000301'
const other = '00000000-0000-4000-8000-000000000302'
const record = { id: ID, name: 'Authorized Program', source_revision: '7', updated_at: '2026-10-19T14:00:00Z' }

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
