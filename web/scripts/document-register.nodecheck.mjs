import assert from 'node:assert/strict'
import test from 'node:test'
import { loadDocumentPages, documentResponseHref, attachDocumentToDraft, previewKind } from '../src/features/programs/documentRegisterModel.ts'
test('document pagination retains Program and history scope on every page', async () => {
 const paths=[]
 const items=await loadDocumentPages('program-A',false,async path=>{
  paths.push(new URL(path,'http://local'))
  return paths.length===1?{items:['original'],next_cursor:'next'}:{items:['replacement']}
 })
 assert.deepEqual(items,['original','replacement'])
 for(const url of paths){assert.equal(url.searchParams.get('program_id'),'program-A');assert.equal(url.searchParams.get('current_only'),'false')}
 assert.equal(paths[1].searchParams.get('cursor'),'next')
})
test('a failed page rejects the whole load and a retry starts fresh',async()=>{
 let calls=0
 await assert.rejects(loadDocumentPages('p',true,async()=>{if(++calls===1)return {items:['partial'],next_cursor:'next'};throw Error('unavailable')}),/unavailable/)
 assert.deepEqual(await loadDocumentPages('p',true,async()=>({items:['complete']})),['complete'])
})
test('cancelled loads publish no stale files and repeated cursors fail',async()=>{
 assert.deepEqual(await loadDocumentPages('p',true,async()=>({items:['stale']}),()=>false),[])
 await assert.rejects(loadDocumentPages('p',true,async()=>({items:[],next_cursor:'same'})),/paging changed/)
})
test('document navigation preserves Program and targets exact revision and question',()=>{
 const url=new URL(documentResponseHref('http://local/?screen=programs&program=p&tab=documents',{request_id:'r',submission_id:'original',field_id:'file'}))
 for(const [key,value] of Object.entries({program:'p',tab:'assessment',request:'r',submission:'original',field:'file'}))assert.equal(url.searchParams.get(key),value)
})

test('attaching evidence preserves other draft answers and the source draft',()=>{
 const original={date:{text:'2026-11-19'},proof:{artifact_ids:['old']}}
 const updated=attachDocumentToDraft(original,'proof','new')
 assert.deepEqual(updated,{date:{text:'2026-11-19'},proof:{artifact_ids:['new']}})
 assert.deepEqual(original.proof.artifact_ids,['old'])
})
test('previews accept inert image, text and PDF types and reject HTML and SVG',()=>{
 assert.equal(previewKind('text/plain; charset=utf-8'),'text')
 assert.equal(previewKind('application/pdf'),'pdf')
 assert.equal(previewKind('image/png'),'image')
 assert.equal(previewKind('image/svg+xml'),'unavailable')
 assert.equal(previewKind('text/html'),'unavailable')
})
