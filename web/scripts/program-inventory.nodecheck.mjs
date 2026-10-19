import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchProgramInventory, validInventoryPage } from '../src/features/programs/inventoryClient.ts'

const program = '00000000-0000-4000-8000-000000000301'
const itemId = '00000000-0000-4000-8000-000000000501'
const control = { id: itemId, name: 'Linked control', status: 'IMPLEMENTED',
  version: 2, updated_at: '2026-10-19T14:00:00Z' }
const contract = { ...control, code: 'E-1', name: 'Evidence contract', status: 'ACTIVE' }

test('validates only intended lifecycle metadata for each inventory kind', () => {
  assert.equal(validInventoryPage({ program_id:program, program_revision:'7',items:[control] },
    'controls',program),true)
  assert.equal(validInventoryPage({ program_id:program, program_revision:'7',items:[contract] },
    'evidence-contracts',program),true)
  for (const payload of [
    { items:[control,control] }, { items:[{...control,status:'RETIRED'}] },
    { items:[{...control,id:'invalid'}] }, { items:[{...control,name:''}] },
    { items:[{...control,version:0}] }, { items:Array(26).fill(control) },
    { items:[{...control,updated_at:'bad date'}] },
  ]) assert.equal(validInventoryPage({
    program_id:program,program_revision:'7',...payload,
  },'controls',program),false)
  assert.equal(validInventoryPage({program_id:program,program_revision:'7',items:[control]},
    'evidence-contracts',program),false)
  assert.equal(validInventoryPage({program_id:program,program_revision:'7',items:[{...contract,status:'DRAFT'}]},
    'evidence-contracts',program),false)
})

test('fetches Control and Evidence metadata through trusted same-origin session',async()=>{
  const original=globalThis.fetch
  try{
    for(const [kind,item] of [['controls',control],['evidence-contracts',contract]]){
      const page={program_id:program,program_revision:'7',items:[item],next_cursor:'next'}
      globalThis.fetch=async(url,opts)=>{
        assert.equal(url,'/api/v1/programs/'+program+'/'+kind+'?limit=25&cursor=opaque')
        assert.equal(opts.method,'GET')
        assert.equal(opts.credentials,'same-origin')
        assert.equal(opts.cache,'no-store')
        assert.deepEqual(opts.headers,{Accept:'application/json'})
        return {status:200,ok:true,json:async()=>page}
      }
      assert.deepEqual(await fetchProgramInventory(program,'7',kind,'opaque',
        new AbortController().signal),{status:'ready',page})
    }
  }finally{globalThis.fetch=original}
})

test('separates denied, missing, stale and invalid Program source reads',async()=>{
 const original=globalThis.fetch
 try{
  for(const [code,status] of [[401,'unauthenticated'],[403,'forbidden'],
    [404,'not_found'],[503,'unavailable']]){
    globalThis.fetch=async()=>({status:code,ok:false})
    assert.deepEqual(await fetchProgramInventory(program,'7','controls','',
      new AbortController().signal),{status})
  }
  globalThis.fetch=async()=>({status:200,ok:true,json:async()=>({
    program_id:program,program_revision:'8',items:[control],
  })})
  assert.deepEqual(await fetchProgramInventory(program,'7','controls','',
    new AbortController().signal),{status:'changed'})
  assert.deepEqual(await fetchProgramInventory('INVALID','7','controls','',
    new AbortController().signal),{status:'unavailable'})
  globalThis.fetch=async()=>({status:200,ok:true,json:async()=>({
    program_id:'00000000-0000-4000-8000-000000000302',program_revision:'7',items:[control],
  })})
  assert.deepEqual(await fetchProgramInventory(program,'7','controls','',
    new AbortController().signal),{status:'unavailable'})
 }finally{globalThis.fetch=original}
})
